/**
 * The browser database of the listening history: finished sessions, the
 * draft of a session still open (ADR-62) and the melodies saved from the
 * listening screen (P-17).
 *
 * Version 1 held only `sessions`. Version 2 adds `drafts` and version 3
 * `melodies`; upgrading only creates the stores that are missing, so every
 * session and draft kept before stays.
 */
export const HISTORY_DATABASE = 'neuromelody';
export const HISTORY_VERSION = 3;
export const SESSIONS_STORE = 'sessions';
export const DRAFTS_STORE = 'drafts';
export const MELODIES_STORE = 'melodies';

/**
 * Opens the database, creating or upgrading its stores. `onFailure` builds the
 * error the caller reports; `onClosed` is told when the connection is closed
 * so that a newer version opened in another tab can upgrade it.
 */
export function openHistoryDatabase(
  factory: IDBFactory, onFailure: (cause: DOMException | null) => Error, onClosed: () => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(HISTORY_DATABASE, HISTORY_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const name of [SESSIONS_STORE, DRAFTS_STORE, MELODIES_STORE]) {
        if (!database.objectStoreNames.contains(name)) database.createObjectStore(name, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      // A newer version opened in another tab must not wait for this one: it closes, and opens again when needed.
      database.onversionchange = () => { database.close(); onClosed(); };
      resolve(database);
    };
    request.onerror = () => { reject(onFailure(request.error)); };
  });
}
