import { MELODIES_STORE, openHistoryDatabase } from '../records/historyDatabase';
import { SessionStoreError } from '../records/sessionStore';
import { byNewest, readMelody, type Melody } from './melody';

/**
 * Melodies kept on this device (P-17), in the history database. The store
 * keeps every account's melodies; each screen asks only for those of the
 * account signed in, as the session history does (ADR-61).
 */
export interface MelodyStore {
  /** The melodies of `owner`, most recently changed first; unreadable entries are left out. */
  list(owner: string): Promise<Melody[]>;
  /** Writes the melody, replacing the one with its id. A malformed melody is refused. */
  put(melody: Melody): Promise<void>;
  /** Deleting a melody that is not there is not an error. */
  delete(id: string): Promise<void>;
}

function checked(melody: Melody): Melody {
  const valid = readMelody(melody);
  if (valid === null) throw new SessionStoreError('invalid_record', 'The melody is malformed.');
  return valid;
}

/** In-memory melodies for tests and for browsers without IndexedDB, where they last for the visit. */
export class MemoryMelodyStore implements MelodyStore {
  readonly #melodies = new Map<string, Melody>();

  list(owner: string): Promise<Melody[]> {
    return Promise.resolve([...this.#melodies.values()].filter((melody) => melody.ownerId === owner).sort(byNewest));
  }

  put(melody: Melody): Promise<void> {
    try {
      this.#melodies.set(melody.id, structuredClone(checked(melody)));
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  delete(id: string): Promise<void> {
    this.#melodies.delete(id);
    return Promise.resolve();
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => { resolve(request.result); };
    request.onerror = () => { reject(new SessionStoreError('access_failed', 'Could not access the saved melodies.', { cause: request.error })); };
  });
}

/** Melodies in the `melodies` store of the history database (version 3). */
export class IndexedDbMelodyStore implements MelodyStore {
  readonly #factory: IDBFactory;
  #database: Promise<IDBDatabase> | null = null;

  constructor(factory: IDBFactory) {
    this.#factory = factory;
  }

  async #store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    this.#database ??= openHistoryDatabase(
      this.#factory,
      (cause) => new SessionStoreError('open_failed', 'Could not open the history database.', { cause }),
      () => { this.#database = null; },
    ).catch((error: unknown) => {
      this.#database = null;
      throw error;
    });
    return (await this.#database).transaction(MELODIES_STORE, mode).objectStore(MELODIES_STORE);
  }

  async list(owner: string): Promise<Melody[]> {
    const stored = await requestResult((await this.#store('readonly')).getAll());
    return stored.map(readMelody).filter((melody): melody is Melody => melody !== null && melody.ownerId === owner).sort(byNewest);
  }

  async put(melody: Melody): Promise<void> {
    await requestResult((await this.#store('readwrite')).put(checked(melody)));
  }

  async delete(id: string): Promise<void> {
    await requestResult((await this.#store('readwrite')).delete(id));
  }
}

export function createBrowserMelodyStore(): MelodyStore {
  return typeof indexedDB === 'undefined' ? new MemoryMelodyStore() : new IndexedDbMelodyStore(indexedDB);
}
