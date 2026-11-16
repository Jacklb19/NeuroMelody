import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudError } from '../cloud/cloudApi';
import { useCloudSync } from '../cloud/cloudSyncContext';
import { createMelody, MAX_MELODIES, renameMelody, type Melody, type MelodyContent } from './melody';
import { useMelodyStore } from './melodyStoreContext';
import {
  EMPTY_LEDGER,
  readMelodyLedger,
  syncMelodies,
  withDeletion,
  writeMelodyLedger,
  type MelodyLedger,
} from './melodySync';

/**
 * Where the melodies stand with the cloud (P-17):
 * - `local`: there is no cloud to reach (no API, or one from before the melodies).
 * - `syncing`, `synced`: on the way, or the same on both sides.
 * - `offline`: the cloud could not be reached; they wait on this device.
 * - `full`: the cloud keeps 50; the rest stay on this device.
 */
export type MelodyCloudState = 'local' | 'syncing' | 'synced' | 'offline' | 'full';

export interface MelodiesView {
  /** The account's melodies, most recently changed first; `null` while they are read. */
  readonly melodies: readonly Melody[] | null;
  readonly cloud: MelodyCloudState;
  /** Melodies the cloud does not have yet. Empty when there is no cloud. */
  readonly pending: ReadonlySet<string>;
  /** The device's storage could not be read or written. */
  readonly failed: boolean;
  /** Saves a new melody of the account; rejects with `'full'` when it keeps as many as it may. */
  readonly save: (content: MelodyContent) => Promise<Melody>;
  readonly rename: (id: string, name: string) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
}

/** The account already keeps as many melodies as it may (`MAX_MELODIES`). */
export class MelodyLimitError extends Error {
  constructor() {
    super('The account keeps as many melodies as it may.');
    this.name = 'MelodyLimitError';
  }
}

function localStorageOrNull(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface Options {
  /** Whether to bring the cloud up to date; screens that only show a count leave it to the listening screen. */
  readonly sync?: boolean;
}

/**
 * The melodies of `owner` on this device, kept in step with the cloud while
 * a screen uses them: when it opens, after every change, when the
 * connection comes back and when the page is seen again. One pass at a
 * time; a change during a pass asks for one more.
 */
export function useMelodies(owner: string | null, { sync = true }: Options = {}): MelodiesView {
  const store = useMelodyStore();
  const { api } = useCloudSync();
  const [melodies, setMelodies] = useState<readonly Melody[] | null>(null);
  const [cloud, setCloud] = useState<MelodyCloudState>(api === null || !sync ? 'local' : 'syncing');
  const [ledger, setLedger] = useState<MelodyLedger>(EMPTY_LEDGER);
  const [failed, setFailed] = useState(false);
  const running = useRef(false);
  const again = useRef(false);
  // Read through a function: a pass can be asked for again while the one before is still awaiting.
  const askedAgain = (): boolean => again.current;
  // Read inside callbacks: the latest list, without making every callback new on each change.
  const current = useRef<readonly Melody[]>([]);

  const reload = useCallback(async (): Promise<void> => {
    if (owner === null) return;
    try {
      const listed = await store.list(owner);
      current.current = listed;
      setMelodies(listed);
      setFailed(false);
    } catch {
      setFailed(true);
      setMelodies((value) => value ?? []);
    }
  }, [owner, store]);

  const runSync = useCallback(async (): Promise<void> => {
    if (owner === null || api === null || !sync) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        again.current = false;
        setCloud('syncing');
        try {
          const outcome = await syncMelodies(owner, store, api, readMelodyLedger(owner, localStorageOrNull()));
          if (outcome.kind === 'unsupported') {
            setCloud('local');
            setLedger(EMPTY_LEDGER);
          } else {
            writeMelodyLedger(owner, outcome.ledger, localStorageOrNull());
            setLedger(outcome.ledger);
            setCloud(outcome.kind === 'full' ? 'full' : 'synced');
            if (outcome.changedHere) await reload();
          }
        } catch (error) {
          setLedger(readMelodyLedger(owner, localStorageOrNull()));
          // Anything but a refusal of the account is a connection that may come back.
          setCloud(error instanceof CloudError && error.code === 'unauthenticated' ? 'local' : 'offline');
        }
      } while (askedAgain());
    } finally {
      running.current = false;
    }
  }, [owner, api, sync, store, reload]);

  useEffect(() => {
    if (owner === null) return undefined;
    let cancelled = false;
    store.list(owner).then(
      (listed) => {
        if (cancelled) return;
        current.current = listed;
        setMelodies(listed);
        setFailed(false);
        void runSync();
      },
      () => {
        if (cancelled) return;
        setFailed(true);
        setMelodies([]);
      },
    );
    return () => { cancelled = true; };
  }, [owner, store, runSync]);

  useEffect(() => {
    if (owner === null || api === null || !sync) return undefined;
    const onOnline = (): void => { void runSync(); };
    const onVisible = (): void => { if (document.visibilityState === 'visible') void runSync(); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [owner, api, sync, runSync]);

  const save = useCallback(async (content: MelodyContent): Promise<Melody> => {
    if (owner === null) throw new Error('Nobody is signed in.');
    if (current.current.length >= MAX_MELODIES) throw new MelodyLimitError();
    const melody = createMelody(content, owner);
    await store.put(melody);
    await reload();
    void runSync();
    return melody;
  }, [owner, store, reload, runSync]);

  const rename = useCallback(async (id: string, name: string): Promise<void> => {
    const melody = current.current.find((item) => item.id === id);
    if (melody === undefined) return;
    await store.put(renameMelody(melody, name));
    await reload();
    void runSync();
  }, [store, reload, runSync]);

  const remove = useCallback(async (id: string): Promise<void> => {
    if (owner === null) return;
    await store.delete(id);
    // A melody the cloud keeps is deleted there on the next pass, even if it happens without a connection now.
    const next = withDeletion(readMelodyLedger(owner, localStorageOrNull()), id);
    writeMelodyLedger(owner, next, localStorageOrNull());
    setLedger(next);
    await reload();
    void runSync();
  }, [owner, store, reload, runSync]);

  const cloudless = api === null || !sync || cloud === 'local';
  const pending = cloudless
    ? new Set<string>()
    : new Set((melodies ?? []).filter((melody) => !ledger.synced.has(melody.id)).map((melody) => melody.id));
  return { melodies: owner === null ? [] : melodies, cloud: cloudless ? 'local' : cloud, pending, failed, save, rename, remove };
}
