import { isFavoritePlan, type FavoritePlan } from '../plan/favorites';
import { readSessionRecord, type SessionRecord } from './sessionRecord';

export const BACKUP_FORMAT = 'neuromelody-listening';
export const BACKUP_VERSION = 1;
/** Avoid reading an unbounded file into browser memory. */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export interface ListeningBackup {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: typeof BACKUP_VERSION;
  readonly owner: string;
  readonly sessions: readonly SessionRecord[];
  readonly favorites: readonly FavoritePlan[];
}

/** Validate the whole backup before writing any part of it. */
export function parseListeningBackup(text: string, owner: string): ListeningBackup {
  const raw: unknown = JSON.parse(text);
  if (typeof raw !== 'object' || raw === null) throw new TypeError('Invalid backup.');
  const data = raw as Record<string, unknown>;
  if (data.format !== BACKUP_FORMAT || data.version !== BACKUP_VERSION || data.owner !== owner ||
    !Array.isArray(data.sessions) || !Array.isArray(data.favorites) || !data.favorites.every(isFavoritePlan)) {
    throw new TypeError('Invalid backup.');
  }
  const sessions = data.sessions.map((record: unknown) => {
    const parsed = readSessionRecord(record);
    if (parsed === null || parsed.ownerId !== owner) throw new TypeError('Invalid backup session.');
    return parsed;
  });
  const favorites: FavoritePlan[] = data.favorites;
  if (new Set(sessions.map(({ id }) => id)).size !== sessions.length ||
    new Set(favorites.map(({ name }) => name)).size !== favorites.length) {
    throw new TypeError('Duplicate entries in backup.');
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, owner, sessions, favorites };
}
