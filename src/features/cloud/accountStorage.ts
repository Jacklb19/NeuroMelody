import { favoritesStorageKey } from '../plan/favorites';
import { narrativeStorageKey } from '../summary/narrativeCache';
import { PENDING_DELETIONS_STORAGE_PREFIX, SET_ASIDE_STORAGE_PREFIX, SYNC_MARKS_STORAGE_PREFIX } from './syncSessions';

type RemovableStorage = Pick<Storage, 'removeItem'>;

function browserStorage(): RemovableStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Every key this device keeps for one account, besides its sessions. */
export function accountStorageKeys(owner: string): readonly string[] {
  return [
    `${SYNC_MARKS_STORAGE_PREFIX}${owner}`,
    `${PENDING_DELETIONS_STORAGE_PREFIX}${owner}`,
    `${SET_ASIDE_STORAGE_PREFIX}${owner}`,
    narrativeStorageKey(owner),
    favoritesStorageKey(owner),
  ];
}

/**
 * Removes what this device keeps for an account that no longer exists: its
 * marks, queues, automatic texts and favorites (ADR-61). Blocked storage
 * leaves nothing to remove.
 */
export function removeAccountStorage(owner: string, storage: RemovableStorage | null = browserStorage()): void {
  for (const key of accountStorageKeys(owner)) {
    try {
      storage?.removeItem(key);
    } catch {
      // Unavailable storage: nothing of it can be read either.
    }
  }
}
