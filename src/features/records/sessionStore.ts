import { isRating, isSessionRecord, type SessionRecord } from './sessionRecord';

/** Raised when the local history cannot be read or written. */
export class SessionStoreError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SessionStoreError';
  }
}

/** Sessions kept on this device (RF-14, RF-16); no account needed. */
export interface SessionStore {
  save(record: SessionRecord): Promise<void>;
  get(id: string): Promise<SessionRecord | null>;
  /** All valid sessions, newest first. */
  list(): Promise<SessionRecord[]>;
  setRatingAfter(id: string, rating: number | null): Promise<SessionRecord>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

const newestFirst = (a: SessionRecord, b: SessionRecord): number => b.startedAt.localeCompare(a.startedAt);

/**
 * Shared rules of every store: validates at the boundary in both directions
 * and drops entries that no longer match the record shape instead of failing.
 */
abstract class ValidatingStore implements SessionStore {
  protected abstract read(id: string): Promise<unknown>;
  protected abstract readAll(): Promise<unknown[]>;
  protected abstract write(record: SessionRecord): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract clear(): Promise<void>;

  async save(record: SessionRecord): Promise<void> {
    if (!isSessionRecord(record)) throw new SessionStoreError('La sesión no tiene un formato válido.');
    await this.write(record);
  }

  async get(id: string): Promise<SessionRecord | null> {
    const value = await this.read(id);
    return isSessionRecord(value) ? value : null;
  }

  async list(): Promise<SessionRecord[]> {
    return (await this.readAll()).filter(isSessionRecord).sort(newestFirst);
  }

  async setRatingAfter(id: string, rating: number | null): Promise<SessionRecord> {
    if (!isRating(rating)) throw new SessionStoreError('La valoración debe ser un número entero de 0 a 10.');
    const record = await this.get(id);
    if (record === null) throw new SessionStoreError('No se encontró la sesión.');
    const updated = { ...record, ratingAfter: rating };
    await this.write(updated);
    return updated;
  }
}

/** In-memory store for tests and for browsers without IndexedDB. */
export class MemorySessionStore extends ValidatingStore {
  readonly #records = new Map<string, unknown>();

  protected read(id: string): Promise<unknown> {
    return Promise.resolve(this.#records.get(id));
  }

  protected readAll(): Promise<unknown[]> {
    return Promise.resolve([...this.#records.values()]);
  }

  protected write(record: SessionRecord): Promise<void> {
    this.#records.set(record.id, structuredClone(record));
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.#records.delete(id);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.#records.clear();
    return Promise.resolve();
  }
}

const DATABASE = 'neuromelody';
const VERSION = 1;
const SESSIONS = 'sessions';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => { resolve(request.result); };
    request.onerror = () => { reject(new SessionStoreError('No se pudo acceder al historial del dispositivo.', { cause: request.error })); };
  });
}

/** Sessions stored in the browser's IndexedDB, keyed by their UUID v7. */
export class IndexedDbSessionStore extends ValidatingStore {
  readonly #factory: IDBFactory;
  #database: Promise<IDBDatabase> | null = null;

  constructor(factory: IDBFactory) {
    super();
    this.#factory = factory;
  }

  #open(): Promise<IDBDatabase> {
    this.#database ??= new Promise((resolve, reject) => {
      const request = this.#factory.open(DATABASE, VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(SESSIONS)) {
          request.result.createObjectStore(SESSIONS, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => { resolve(request.result); };
      request.onerror = () => {
        this.#database = null;
        reject(new SessionStoreError('No se pudo abrir el historial del dispositivo.', { cause: request.error }));
      };
    });
    return this.#database;
  }

  async #store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return (await this.#open()).transaction(SESSIONS, mode).objectStore(SESSIONS);
  }

  protected async read(id: string): Promise<unknown> {
    return requestResult((await this.#store('readonly')).get(id));
  }

  protected async readAll(): Promise<unknown[]> {
    return requestResult((await this.#store('readonly')).getAll());
  }

  protected async write(record: SessionRecord): Promise<void> {
    await requestResult((await this.#store('readwrite')).put(record));
  }

  async delete(id: string): Promise<void> {
    await requestResult((await this.#store('readwrite')).delete(id));
  }

  async clear(): Promise<void> {
    await requestResult((await this.#store('readwrite')).clear());
  }
}

/** The store for this browser: IndexedDB when available, memory otherwise. */
export function createBrowserSessionStore(): SessionStore {
  return typeof indexedDB === 'undefined' ? new MemorySessionStore() : new IndexedDbSessionStore(indexedDB);
}
