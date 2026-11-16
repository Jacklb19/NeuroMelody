import { CloudError, type CloudMelody } from '../cloud/cloudApi';
import { readMelody, type Melody } from './melody';
import type { MelodyStore } from './melodyStore';

/**
 * Keeps the melodies of this device and those of the cloud the same (P-17).
 * Melodies are not health data: an account is enough, with no second
 * factor and no sync consent.
 *
 * - A melody on both sides keeps its newest version (`updatedAt`).
 * - A melody only here is sent, unless the cloud had it before: then it was
 *   deleted on another device and goes from here too.
 * - A melody only in the cloud comes here, unless it is waiting to be deleted.
 * - Deletions made without a connection wait in a queue and go first.
 */

/** What the cloud must offer; a subset of the API client. */
export interface MelodyCloud {
  listMelodies(): Promise<CloudMelody[]>;
  saveMelody(melody: Melody): Promise<void>;
  deleteMelody(id: string): Promise<void>;
}

/** What this device remembers of the cloud, per account. */
export interface MelodyLedger {
  /** Melodies the cloud is known to keep. */
  readonly synced: ReadonlySet<string>;
  /** Melodies deleted here whose deletion has not reached the cloud yet. */
  readonly pendingDeletions: ReadonlySet<string>;
}

export const EMPTY_LEDGER: MelodyLedger = { synced: new Set(), pendingDeletions: new Set() };

export type MelodySyncOutcome =
  /** Both sides hold the same melodies. */
  | { readonly kind: 'synced'; readonly ledger: MelodyLedger; readonly changedHere: boolean }
  /** The cloud keeps as many melodies as it may: the rest stay on this device (ADR-63). */
  | { readonly kind: 'full'; readonly ledger: MelodyLedger; readonly changedHere: boolean }
  /** The API in use has no melodies yet (published before P-17): they stay on this device. */
  | { readonly kind: 'unsupported' };

/** Where an account's ledger is kept; exported so deleting the account can remove it. */
export const MELODY_LEDGER_STORAGE_PREFIX = 'neuromelody.melody-sync.';

export function melodyLedgerKey(owner: string): string {
  return `${MELODY_LEDGER_STORAGE_PREFIX}${owner}`;
}

const isIdList = (value: unknown): value is string[] => Array.isArray(value) && value.every((id) => typeof id === 'string');

/** The ledger of `owner`; an unreadable one starts again empty, which only costs a full comparison. */
export function readMelodyLedger(owner: string, storage: Pick<Storage, 'getItem'> | null): MelodyLedger {
  try {
    const value: unknown = JSON.parse(storage?.getItem(melodyLedgerKey(owner)) ?? 'null');
    if (typeof value !== 'object' || value === null) return EMPTY_LEDGER;
    const { synced, pendingDeletions } = value as Record<string, unknown>;
    return isIdList(synced) && isIdList(pendingDeletions)
      ? { synced: new Set(synced), pendingDeletions: new Set(pendingDeletions) }
      : EMPTY_LEDGER;
  } catch {
    return EMPTY_LEDGER;
  }
}

export function writeMelodyLedger(owner: string, ledger: MelodyLedger, storage: Pick<Storage, 'setItem'> | null): void {
  try {
    storage?.setItem(melodyLedgerKey(owner), JSON.stringify({ synced: [...ledger.synced], pendingDeletions: [...ledger.pendingDeletions] }));
  } catch {
    // Blocked storage: the next sync compares everything again.
  }
}

/** The ledger after deleting a melody here: one the cloud keeps must be deleted there too. */
export function withDeletion(ledger: MelodyLedger, id: string): MelodyLedger {
  if (!ledger.synced.has(id)) return ledger;
  const synced = new Set(ledger.synced);
  synced.delete(id);
  return { synced, pendingDeletions: new Set([...ledger.pendingDeletions, id]) };
}

const newer = (a: { readonly updatedAt: string }, b: { readonly updatedAt: string }): boolean => Date.parse(a.updatedAt) > Date.parse(b.updatedAt);

/**
 * One pass. Rejects with a `CloudError` when the cloud cannot be reached;
 * whatever was done before stays done, and the ledger is only reported on
 * success, so the next pass starts from what both sides hold.
 */
export async function syncMelodies(owner: string, store: MelodyStore, cloud: MelodyCloud, start: MelodyLedger): Promise<MelodySyncOutcome> {
  const synced = new Set(start.synced);
  const pendingDeletions = new Set(start.pendingDeletions);
  let listed: CloudMelody[];
  try {
    for (const id of [...pendingDeletions]) {
      await cloud.deleteMelody(id);
      pendingDeletions.delete(id);
    }
    listed = await cloud.listMelodies();
  } catch (error) {
    // An API without the melodies answers an unknown path with 404.
    if (error instanceof CloudError && error.code === 'not_found') return { kind: 'unsupported' };
    throw error;
  }

  let changedHere = false;
  const remote = new Map<string, Melody>();
  for (const item of listed) {
    const melody = readMelody({ ...item, ownerId: owner });
    if (melody !== null) remote.set(melody.id, melody);
  }

  let full = false;
  for (const local of await store.list(owner)) {
    const there = remote.get(local.id);
    remote.delete(local.id);
    if (there !== undefined) {
      if (newer(there, local)) {
        await store.put(there);
        changedHere = true;
      } else if (newer(local, there)) {
        await cloud.saveMelody(local);
      }
      synced.add(local.id);
    } else if (synced.has(local.id)) {
      // The cloud had it and no longer does: it was deleted on another device.
      await store.delete(local.id);
      synced.delete(local.id);
      changedHere = true;
    } else if (!full) {
      try {
        await cloud.saveMelody(local);
        synced.add(local.id);
      } catch (error) {
        if (!(error instanceof CloudError && error.code === 'limit_reached')) throw error;
        full = true;
      }
    }
  }
  for (const melody of remote.values()) {
    await store.put(melody);
    synced.add(melody.id);
    changedHere = true;
  }
  const ledger = { synced, pendingDeletions };
  return { kind: full ? 'full' : 'synced', ledger, changedHere };
}
