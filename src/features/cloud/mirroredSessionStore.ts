import type { SessionRecord } from '../records/sessionRecord';
import type { SessionStore } from '../records/sessionStore';
import type { CloudApi } from './cloudApi';
import type { SyncMarks } from './syncSessions';

interface MirrorOptions {
  readonly local: SessionStore;
  /** Marks of whoever is signed in now; they change with the account. */
  readonly marks: () => SyncMarks;
  /** The API while syncing is on (account, two steps and consent); `null` otherwise. */
  readonly cloud: () => CloudApi | null;
  /** Told when a background upload fails, so the screen can say it; the session stays on the device. */
  readonly onUploadError: (cause: unknown) => void;
}

/**
 * The history every screen uses: this device's store, mirrored to the cloud
 * while syncing is on. Screens keep calling the same `SessionStore`.
 *
 * - Saving and rating write to the device first and never wait for the
 *   network: a session is never lost because the cloud was slow or down. The
 *   upload runs behind and the next sync retries it.
 * - Deleting does the opposite and deletes from the cloud first. If that
 *   fails, nothing is deleted and the person is told, because a session
 *   left in the cloud would come back on the next sync.
 */
export function createMirroredSessionStore({ local, marks, cloud, onUploadError }: MirrorOptions): SessionStore {
  const upload = (record: SessionRecord): void => {
    const api = cloud();
    if (api === null) return;
    api.saveSession(record).then(() => { marks().add(record.id); }, onUploadError);
  };

  const deleteEverywhere = async (id: string): Promise<void> => {
    const api = cloud();
    // A session that was never sent has nothing to delete in the cloud.
    if (api !== null && marks().has(id)) await api.deleteSession(id);
    await local.delete(id);
    marks().remove(id);
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
      if (cloud() === null) {
        await local.clear();
        return;
      }
      for (const record of await local.list()) await deleteEverywhere(record.id);
    },
  };
}
