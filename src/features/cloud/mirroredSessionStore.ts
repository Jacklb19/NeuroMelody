import type { SessionRecord } from '../records/sessionRecord';
import { SessionStoreError, type SessionStore } from '../records/sessionStore';
import type { CloudApi } from './cloudApi';
import { belongsTo, markedByOtherAccounts, type PendingDeletions, type SyncMarks } from './syncSessions';

interface MirrorOptions {
  readonly local: SessionStore;
  /**
   * Account signed in, the owner of what is recorded and the only one whose
   * sessions this store shows; `null` without one, and then it shows none.
   */
  readonly owner: string | null;
  /** Sessions other accounts of this device have in their cloud; read from their marks by default. */
  readonly others?: (owner: string) => ReadonlySet<string>;
  /** Marks of whoever is signed in now; they change with the account. */
  readonly marks: () => SyncMarks;
  /** Deletions waiting for the cloud, of whoever is signed in now. */
  readonly deletions: () => PendingDeletions;
  /** The API while syncing is on (account, two steps and consent); `null` otherwise. */
  readonly cloud: () => CloudApi | null;
  /** Told when a background upload fails, so the screen can say it; the session stays on the device. */
  readonly onUploadError: (cause: unknown) => void;
  /** Told when a deletion starts or stops waiting for the cloud. */
  readonly onPendingChange: () => void;
}

/**
 * The history every screen uses: this device's store, mirrored to the cloud
 * while syncing is on. Screens keep calling the same `SessionStore`.
 *
 * - Saving and rating write to the device first and never wait for the
 *   network: a session is never lost because the cloud was slow or down. The
 *   upload runs behind and the next sync retries it.
 * - A session recorded with an account signed in belongs to it on this
 *   device; one of another account is never uploaded to the account signed in.
 * - Each account sees only its own sessions (ADR-61): listing, reading by id,
 *   notes, ratings and deleting all treat a session of another account of
 *   this device as one that does not exist. A session without an owner is
 *   shown to the account signed in, which claims it (`claimUnownedSessions`).
 * - Deleting does not wait either (HU-09): the session leaves the device at
 *   once. If it was ever sent, its deletion is written down before anything
 *   else and stays queued until the cloud confirms it, now or on a later
 *   sync, which delivers the queue before reading the cloud. So a session
 *   deleted without a connection does not come back.
 */
export function createMirroredSessionStore({
  local, owner, others = markedByOtherAccounts, marks, deletions, cloud, onUploadError, onPendingChange,
}: MirrorOptions): SessionStore {
  /** Whether the account signed in may see this session; without an account, none. */
  const visibleTo = (): ((record: SessionRecord) => boolean) => {
    if (owner === null) return () => false;
    const elsewhere = others(owner);
    return (record) => belongsTo(record, owner, elsewhere);
  };

  /** The session, only when it is of the account signed in; otherwise it does not exist here. */
  const own = async (id: string): Promise<SessionRecord | null> => {
    const record = await local.get(id);
    return record !== null && visibleTo()(record) ? record : null;
  };

  const requireOwn = async (id: string): Promise<void> => {
    if ((await own(id)) === null) throw new SessionStoreError('not_found', 'The session no longer exists.');
  };

  const upload = (record: SessionRecord): void => {
    const api = cloud();
    if (api === null || owner === null || !visibleTo()(record)) return;
    api.saveSession(record).then(() => { marks().add(record.id); }, onUploadError);
  };

  const deleteEverywhere = async (id: string): Promise<void> => {
    // Another account's session is not there for this one: nothing to delete.
    if ((await own(id)) === null) return;
    // A session that was never sent has nothing to delete in the cloud.
    const sent = marks().has(id);
    const queue = deletions();
    // Queued first: closing the app right after this line still deletes it from the cloud later.
    if (sent) queue.add(id);
    await local.delete(id);
    marks().remove(id);
    const api = cloud();
    if (sent && api !== null) {
      try {
        await api.deleteSession(id);
        queue.remove(id);
      } catch {
        // No connection, or the cloud did not answer: it stays queued for the next sync.
      }
    }
    if (sent) onPendingChange();
  };

  return {
    async save(record) {
      const existing = await local.get(record.id);
      if (existing !== null && !visibleTo()(existing)) {
        throw new SessionStoreError('invalid_record', 'The session belongs to another account.');
      }
      const owned = owner !== null && record.ownerId === undefined ? { ...record, ownerId: owner } : record;
      await local.save(owned);
      upload(owned);
    },
    get: own,
    async list() {
      const visible = visibleTo();
      return (await local.list()).filter(visible);
    },
    async restore(records) {
      if (owner === null || records.some((record) => record.ownerId !== owner)) {
        throw new SessionStoreError('invalid_record', 'The backup belongs to another account.');
      }
      await local.restore(records);
    },
    async setNote(id, note) {
      await requireOwn(id);
      return local.setNote(id, note);
    },
    async setOwner(id, ownerId) {
      await requireOwn(id);
      return local.setOwner(id, ownerId);
    },
    async setRatingAfter(id, rating) {
      await requireOwn(id);
      const updated = await local.setRatingAfter(id, rating);
      upload(updated);
      return updated;
    },
    delete: deleteEverywhere,
    async clear() {
      const visible = visibleTo();
      for (const record of await local.list()) if (visible(record)) await deleteEverywhere(record.id);
    },
  };
}

/**
 * Gives the account signed in the sessions of this device that have no owner
 * and that no other account has in its cloud (decision of 14 nov 2026): the
 * first account to sign in after the update keeps them, and no later one sees
 * them. Resolves with how many it claimed.
 */
export async function claimUnownedSessions(
  local: SessionStore, owner: string, others: ReadonlySet<string> = markedByOtherAccounts(owner),
): Promise<number> {
  let claimed = 0;
  for (const record of await local.list()) {
    if (record.ownerId !== undefined || others.has(record.id)) continue;
    await local.setOwner(record.id, owner);
    claimed++;
  }
  return claimed;
}
