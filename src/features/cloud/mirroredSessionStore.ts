import type { SessionRecord } from '../records/sessionRecord';
import type { SessionStore } from '../records/sessionStore';
import type { CloudApi } from './cloudApi';
import type { PendingDeletions, SyncMarks } from './syncSessions';

interface MirrorOptions {
  readonly local: SessionStore;
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
 * - Deleting does not wait either (HU-09): the session leaves the device at
 *   once. If it was ever sent, its deletion is written down before anything
 *   else and stays queued until the cloud confirms it, now or on a later
 *   sync, which delivers the queue before reading the cloud. So a session
 *   deleted without a connection does not come back.
 */
export function createMirroredSessionStore({
  local, marks, deletions, cloud, onUploadError, onPendingChange,
}: MirrorOptions): SessionStore {
  const upload = (record: SessionRecord): void => {
    const api = cloud();
    if (api === null) return;
    api.saveSession(record).then(() => { marks().add(record.id); }, onUploadError);
  };

  const deleteEverywhere = async (id: string): Promise<void> => {
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
      await local.save(record);
      upload(record);
    },
    get: (id) => local.get(id),
    list: () => local.list(),
    async setRatingAfter(id, rating) {
      const updated = await local.setRatingAfter(id, rating);
      upload(updated);
      return updated;
    },
    delete: deleteEverywhere,
    async clear() {
      for (const record of await local.list()) await deleteEverywhere(record.id);
    },
  };
}
