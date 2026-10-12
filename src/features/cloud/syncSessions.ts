import type { SessionStore } from '../records/sessionStore';
import type { CloudApi } from './cloudApi';

/**
 * Which sessions of this device are already in the cloud. Without it, a
 * session missing from the cloud could mean two opposite things: it was
 * never sent, or it was deleted from another device.
 */
export interface SyncMarks {
  has(id: string): boolean;
  add(id: string): void;
  remove(id: string): void;
  clear(): void;
}

/** Prefix of the storage key; the account id follows, so each account has its own marks. */
export const SYNC_MARKS_STORAGE_PREFIX = 'neuromelody.synced-sessions.';

type MarkStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Browser storage; merely accessing `localStorage` can throw. */
function browserStorage(): MarkStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Marks of one account, kept in the browser's storage. They are per account
 * so that another person signing in on this device never reads a session of
 * the first one as "deleted elsewhere". Without an account or without
 * storage they last for this visit only.
 */
export function createSyncMarks(userId: string | null, available: MarkStorage | null = browserStorage()): SyncMarks {
  const storage = userId === null ? null : available;
  const key = `${SYNC_MARKS_STORAGE_PREFIX}${userId ?? ''}`;
  const ids = new Set<string>();
  try {
    const stored: unknown = JSON.parse(storage?.getItem(key) ?? '[]');
    if (Array.isArray(stored)) for (const id of stored) if (typeof id === 'string') ids.add(id);
  } catch {
    // Unreadable marks: every session counts as not sent, and sending again is harmless.
  }
  const persist = (): void => {
    try {
      if (ids.size === 0) storage?.removeItem(key);
      else storage?.setItem(key, JSON.stringify([...ids]));
    } catch {
      // Unavailable storage: the marks hold for this visit.
    }
  };
  return {
    has: (id) => ids.has(id),
    add: (id) => { ids.add(id); persist(); },
    remove: (id) => { ids.delete(id); persist(); },
    clear: () => { ids.clear(); persist(); },
  };
}

/** What one pass changed, for the screens that must read the history again. */
export interface SyncResult {
  readonly uploaded: number;
  readonly downloaded: number;
  /** Sessions removed from this device because they were deleted from another one. */
  readonly removed: number;
}

interface SyncContext {
  readonly api: CloudApi;
  /** The history of this device, not the one that mirrors to the cloud. */
  readonly store: SessionStore;
  readonly marks: SyncMarks;
}

/**
 * Brings this device and the cloud to the same sessions (RF-14):
 *
 * - on the device only and never sent: it is uploaded;
 * - on the device only but sent before: it was deleted elsewhere, so it is removed here;
 * - in the cloud only: it is downloaded;
 * - on both: the rating given after listening, the one field filled in later, is made equal.
 *
 * Sending is idempotent (ADR-18), so a pass interrupted halfway can simply run again.
 */
export async function syncSessions({ api, store, marks }: SyncContext): Promise<SyncResult> {
  const remote = new Map((await api.listSessions()).map((summary) => [summary.id, summary]));
  const local = await store.list();
  let uploaded = 0;
  let downloaded = 0;
  let removed = 0;

  for (const record of local) {
    const summary = remote.get(record.id);
    if (summary === undefined) {
      if (marks.has(record.id)) {
        await store.delete(record.id);
        marks.remove(record.id);
        removed++;
      } else {
        await api.saveSession(record);
        marks.add(record.id);
        uploaded++;
      }
      continue;
    }
    marks.add(record.id);
    if (record.ratingAfter !== null && record.ratingAfter !== summary.ratingAfter) {
      await api.saveSession(record);
      uploaded++;
    } else if (record.ratingAfter === null && summary.ratingAfter !== null) {
      await store.setRatingAfter(record.id, summary.ratingAfter);
      downloaded++;
    }
  }

  const known = new Set(local.map((record) => record.id));
  for (const id of remote.keys()) {
    if (known.has(id)) continue;
    const record = await api.getSession(id);
    // Deleted between the list and this request: nothing to bring.
    if (record === null) continue;
    await store.save(record);
    marks.add(id);
    downloaded++;
  }

  return { uploaded, downloaded, removed };
}
