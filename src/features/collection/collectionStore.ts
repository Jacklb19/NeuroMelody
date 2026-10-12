import { createContext, useContext } from 'react';
import { isCollectionRecording, type CollectionRecording } from './collectionRecording';

/** The guided recordings could not be read or written on this device. */
export class CollectionStoreError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CollectionStoreError';
  }
}

/** Guided recordings kept on this device (ADR-33). Nothing here ever leaves it on its own. */
export interface CollectionStore {
  save(recording: CollectionRecording): Promise<void>;
  /** All valid recordings, newest first. */
  list(): Promise<CollectionRecording[]>;
  delete(id: string): Promise<void>;
}

const newestFirst = (a: CollectionRecording, b: CollectionRecording): number => b.recordedAt.localeCompare(a.recordedAt);

/** Keeps only what still has the shape of a recording, so an old or edited entry cannot reach an export. */
const valid = (entries: readonly unknown[]): CollectionRecording[] => entries.filter(isCollectionRecording).sort(newestFirst);

function assertValid(recording: CollectionRecording): void {
  if (!isCollectionRecording(recording)) throw new CollectionStoreError('The recording does not have a valid shape.');
}

/** Recordings in memory: the fallback without IndexedDB, and the store of the tests. */
export class MemoryCollectionStore implements CollectionStore {
  readonly #recordings = new Map<string, CollectionRecording>();

  save(recording: CollectionRecording): Promise<void> {
    try {
      assertValid(recording);
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new CollectionStoreError('Invalid recording.'));
    }
    this.#recordings.set(recording.id, recording);
    return Promise.resolve();
  }

  list(): Promise<CollectionRecording[]> {
    return Promise.resolve(valid([...this.#recordings.values()]));
  }

  delete(id: string): Promise<void> {
    this.#recordings.delete(id);
    return Promise.resolve();
  }
}

/**
 * A database of its own, apart from the session history: the two kinds of
 * data have different purposes and are deleted separately.
 */
const DATABASE = 'neuromelody-collection';
const VERSION = 1;
const RECORDINGS = 'recordings';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => { resolve(request.result); };
    request.onerror = () => { reject(new CollectionStoreError('Could not access the guided recordings.', { cause: request.error })); };
  });
}

/** Recordings in the browser's IndexedDB, keyed by their UUID v7. */
export class IndexedDbCollectionStore implements CollectionStore {
  readonly #factory: IDBFactory;
  #database: Promise<IDBDatabase> | null = null;

  constructor(factory: IDBFactory) {
    this.#factory = factory;
  }

  #open(): Promise<IDBDatabase> {
    this.#database ??= new Promise((resolve, reject) => {
      const request = this.#factory.open(DATABASE, VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(RECORDINGS)) {
          request.result.createObjectStore(RECORDINGS, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => { resolve(request.result); };
      request.onerror = () => {
        this.#database = null;
        reject(new CollectionStoreError('Could not open the guided recordings database.', { cause: request.error }));
      };
    });
    return this.#database;
  }

  async #store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return (await this.#open()).transaction(RECORDINGS, mode).objectStore(RECORDINGS);
  }

  async save(recording: CollectionRecording): Promise<void> {
    assertValid(recording);
    await requestResult((await this.#store('readwrite')).put(recording));
  }

  async list(): Promise<CollectionRecording[]> {
    return valid(await requestResult<unknown[]>((await this.#store('readonly')).getAll()));
  }

  async delete(id: string): Promise<void> {
    await requestResult((await this.#store('readwrite')).delete(id));
  }
}

/** The store for this browser: IndexedDB when available, memory otherwise. */
export function createBrowserCollectionStore(): CollectionStore {
  return typeof indexedDB === 'undefined' ? new MemoryCollectionStore() : new IndexedDbCollectionStore(indexedDB);
}

/** The recordings available to the screen; tests provide a memory store through this context. */
export const CollectionStoreContext = createContext<CollectionStore>(createBrowserCollectionStore());

export function useCollectionStore(): CollectionStore {
  return useContext(CollectionStoreContext);
}
