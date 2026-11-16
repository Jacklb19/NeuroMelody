import { DRAFTS_STORE, openHistoryDatabase } from './historyDatabase';
import { readSessionDraft, type SessionDraft } from './sessionDraft';
import { SessionStoreError } from './sessionStore';

/** Drafts of open sessions on this device (ADR-62), one per session id. */
export interface SessionDraftStore {
  /** Writes the draft, replacing the earlier one of the same session. */
  put(draft: SessionDraft): Promise<void>;
  /** Every valid draft; unreadable entries are left out. */
  list(): Promise<SessionDraft[]>;
  /** Removing a draft that is not there is not an error. */
  delete(id: string): Promise<void>;
}

/** In-memory drafts for tests and for browsers without IndexedDB, where they last for the visit. */
export class MemorySessionDraftStore implements SessionDraftStore {
  readonly #drafts = new Map<string, unknown>();

  put(draft: SessionDraft): Promise<void> {
    this.#drafts.set(draft.id, structuredClone(draft));
    return Promise.resolve();
  }

  list(): Promise<SessionDraft[]> {
    return Promise.resolve([...this.#drafts.values()].map(readSessionDraft).filter((draft) => draft !== null));
  }

  delete(id: string): Promise<void> {
    this.#drafts.delete(id);
    return Promise.resolve();
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => { resolve(request.result); };
    request.onerror = () => { reject(new SessionStoreError('access_failed', 'Could not access the session drafts.', { cause: request.error })); };
  });
}

/** Drafts in the `drafts` store of the history database. */
export class IndexedDbSessionDraftStore implements SessionDraftStore {
  readonly #factory: IDBFactory;
  #database: Promise<IDBDatabase> | null = null;

  constructor(factory: IDBFactory) {
    this.#factory = factory;
  }

  async #store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    this.#database ??= openHistoryDatabase(
      this.#factory,
      (cause) => new SessionStoreError('open_failed', 'Could not open the session history database.', { cause }),
      () => { this.#database = null; },
    ).catch((error: unknown) => {
      this.#database = null;
      throw error;
    });
    return (await this.#database).transaction(DRAFTS_STORE, mode).objectStore(DRAFTS_STORE);
  }

  async put(draft: SessionDraft): Promise<void> {
    await requestResult((await this.#store('readwrite')).put(draft));
  }

  async list(): Promise<SessionDraft[]> {
    const stored = await requestResult((await this.#store('readonly')).getAll());
    return stored.map(readSessionDraft).filter((draft) => draft !== null);
  }

  async delete(id: string): Promise<void> {
    await requestResult((await this.#store('readwrite')).delete(id));
  }
}

export function createBrowserDraftStore(): SessionDraftStore {
  return typeof indexedDB === 'undefined' ? new MemorySessionDraftStore() : new IndexedDbSessionDraftStore(indexedDB);
}

