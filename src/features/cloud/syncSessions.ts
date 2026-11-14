import type { SessionRecord } from '../records/sessionRecord';
import type { SessionStore } from '../records/sessionStore';
import { CloudError, type CloudApi, type CloudErrorCode } from './cloudApi';

/**
 * Which sessions of this device are already in the cloud. Without it, a
 * session missing from the cloud could mean two opposite things: it was
 * never sent, or it was deleted from another device.
 */
export interface SyncMarks {
  has(id: string): boolean;
  add(id: string): void;
  remove(id: string): void;
  clear(): void;
}

/** Prefix of the storage key; the account id follows, so each account has its own marks. */
export const SYNC_MARKS_STORAGE_PREFIX = 'neuromelody.synced-sessions.';

type MarkStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Browser storage; merely accessing `localStorage` can throw. */
function browserStorage(): MarkStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Marks of one account, kept in the browser's storage. They are per account
 * so that another person signing in on this device never reads a session of
 * the first one as "deleted elsewhere". Without an account or without
 * storage they last for this visit only.
 */
export function createSyncMarks(userId: string | null, available: MarkStorage | null = browserStorage()): SyncMarks {
  const { ids, persist } = storedIds(SYNC_MARKS_STORAGE_PREFIX, userId, available);
  return {
    has: (id) => ids.has(id),
    add: (id) => { ids.add(id); persist(); },
    remove: (id) => { ids.delete(id); persist(); },
    clear: () => { ids.clear(); persist(); },
  };
}

/**
 * Session ids of one account under a storage key, written back on every
 * change. Without an account or without storage they last for this visit.
 */
function storedIds(prefix: string, userId: string | null, available: MarkStorage | null): { ids: Set<string>; persist: () => void } {
  const storage = userId === null ? null : available;
  const key = `${prefix}${userId ?? ''}`;
  const ids = new Set<string>();
  try {
    const stored: unknown = JSON.parse(storage?.getItem(key) ?? '[]');
    if (Array.isArray(stored)) for (const id of stored) if (typeof id === 'string') ids.add(id);
  } catch {
    // Unreadable: it starts empty. For the marks every session counts as not sent, and sending again is harmless.
  }
  const persist = (): void => {
    try {
      if (ids.size === 0) storage?.removeItem(key);
      else storage?.setItem(key, JSON.stringify([...ids]));
    } catch {
      // Unavailable storage: the ids hold for this visit.
    }
  };
  return { ids, persist };
}

type ListableStorage = Pick<Storage, 'length' | 'key' | 'getItem'>;

function listableStorage(): ListableStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Sessions that other accounts of this device have in their cloud, read from
 * their marks. Sessions saved before owners were written down carry none, so
 * these marks are the only trace of whose they are.
 */
export function markedByOtherAccounts(userId: string, available: ListableStorage | null = listableStorage()): ReadonlySet<string> {
  const ids = new Set<string>();
  if (available === null) return ids;
  try {
    for (let index = 0; index < available.length; index++) {
      const key = available.key(index);
      if (key === null || !key.startsWith(SYNC_MARKS_STORAGE_PREFIX) || key === `${SYNC_MARKS_STORAGE_PREFIX}${userId}`) continue;
      const stored: unknown = JSON.parse(available.getItem(key) ?? '[]');
      if (Array.isArray(stored)) for (const id of stored) if (typeof id === 'string') ids.add(id);
    }
  } catch {
    // Unreadable marks: only the owners written in the sessions decide.
  }
  return ids;
}

/**
 * Whether a session of this device belongs to the account `userId`, so it may
 * go to its cloud. A session made without an account belongs to whoever syncs
 * it first, unless another account of this device already has it.
 */
export function belongsTo(record: SessionRecord, userId: string, others: ReadonlySet<string>): boolean {
  return record.ownerId === undefined ? !others.has(record.id) : record.ownerId === userId;
}

/**
 * Sessions already deleted from this device whose deletion the cloud has not
 * confirmed yet (HU-09). They wait here, per account, until a sync delivers
 * them: deleting never needs a connection, and a session deleted without one
 * does not come back from the cloud.
 */
export interface PendingDeletions {
  readonly size: number;
  list(): readonly string[];
  add(id: string): void;
  remove(id: string): void;
}

export const PENDING_DELETIONS_STORAGE_PREFIX = 'neuromelody.pending-deletions.';

export function createPendingDeletions(userId: string | null, available: MarkStorage | null = browserStorage()): PendingDeletions {
  const { ids, persist } = storedIds(PENDING_DELETIONS_STORAGE_PREFIX, userId, available);
  return {
    get size() { return ids.size; },
    list: () => [...ids],
    add: (id) => { ids.add(id); persist(); },
    remove: (id) => { ids.delete(id); persist(); },
  };
}

/**
 * Sessions of this device the cloud refused for what they are, not for the
 * way there: the API found them invalid, or their id is already taken. Sending
 * them again gives the same answer, so a pass skips them instead of stopping
 * on them every time. They stay on the device, per account, untouched.
 */
export interface SetAsideSessions {
  readonly size: number;
  has(id: string): boolean;
  add(id: string): void;
  remove(id: string): void;
}

export const SET_ASIDE_STORAGE_PREFIX = 'neuromelody.set-aside-sessions.';

export function createSetAsideSessions(userId: string | null, available: MarkStorage | null = browserStorage()): SetAsideSessions {
  const { ids, persist } = storedIds(SET_ASIDE_STORAGE_PREFIX, userId, available);
  return {
    get size() { return ids.size; },
    has: (id) => ids.has(id),
    add: (id) => { ids.add(id); persist(); },
    remove: (id) => { ids.delete(id); persist(); },
  };
}

/** Refusals about the session itself; any other failure (network, account, server) stops the pass. */
const REFUSALS_OF_THE_SESSION: ReadonlySet<CloudErrorCode> = new Set(['invalid_request', 'session_conflict']);

/** Sends one session; `false` when the cloud refused that session for good, which is set aside. */
async function sendOrSetAside(api: CloudApi, record: SessionRecord, setAside: SetAsideSessions): Promise<boolean> {
  try {
    await api.saveSession(record);
    return true;
  } catch (cause) {
    if (!(cause instanceof CloudError) || !REFUSALS_OF_THE_SESSION.has(cause.code)) throw cause;
    setAside.add(record.id);
    return false;
  }
}

/** How sending a new session went: stored, set aside for good, or refused because the account is full (ADR-63). */
type NewSessionOutcome = 'sent' | 'set_aside' | 'full';

async function sendNew(api: CloudApi, record: SessionRecord, setAside: SetAsideSessions): Promise<NewSessionOutcome> {
  try {
    return (await sendOrSetAside(api, record, setAside)) ? 'sent' : 'set_aside';
  } catch (cause) {
    if (cause instanceof CloudError && cause.code === 'limit_reached') return 'full';
    throw cause;
  }
}

/** What one pass changed, for the screens that must read the history again. */
export interface SyncResult {
  readonly uploaded: number;
  readonly downloaded: number;
  /** Deletions made without a connection that the cloud has now confirmed. */
  readonly deleted: number;
  /** Sessions removed from this device because they were deleted from another one. */
  readonly removed: number;
  /** Sessions the cloud refused in this pass; they are kept on the device and not sent again. */
  readonly setAside: number;
}

interface SyncContext {
  readonly api: CloudApi;
  /** The history of this device, not the one that mirrors to the cloud. */
  readonly store: SessionStore;
  readonly marks: SyncMarks;
  readonly deletions: PendingDeletions;
  /** Sessions of this account the cloud refused; the provider keeps them on the device, this visit only by default. */
  readonly setAside?: SetAsideSessions;
  /** The account signed in: only its sessions, and those made without an account, take part. */
  readonly owner: string;
  /** Sessions other accounts of this device have in their cloud; read from their marks by default. */
  readonly others?: ReadonlySet<string>;
}

/**
 * Brings this device and the cloud to the same sessions (RF-14). First it
 * delivers the deletions that were waiting for a connection, so none of
 * those sessions is read back from the cloud. Then:
 *
 * - on the device only and never sent: it is uploaded;
 * - on the device only but sent before: it was deleted elsewhere, so it is removed here,
 *   unless the cloud's list was cut short, which leaves older sessions out;
 * - in the cloud only: it is downloaded;
 * - on both: the rating given after listening, the one field filled in later, is made equal.
 *
 * Only the sessions of the account signed in take part. Those of another
 * account of this device are never sent to this one nor removed by its pass,
 * and a session made without an account becomes this account's when sent.
 *
 * Sending and deleting are idempotent (ADR-18): a pass interrupted halfway simply
 * runs again, and nothing is stored twice. A session the cloud refuses for
 * itself (invalid or with a taken id) is set aside and the pass goes on with
 * the rest; it is not sent again. A failure on the way (network, account,
 * server) still stops the pass, which runs again later.
 */
export async function syncSessions({
  api,
  store,
  marks,
  deletions,
  owner,
  setAside = createSetAsideSessions(null),
  others = markedByOtherAccounts(owner),
}: SyncContext): Promise<SyncResult> {
  let deleted = 0;
  for (const id of deletions.list()) {
    // A failure stops the pass here, before the list: the session must not be downloaded again.
    await api.deleteSession(id);
    deletions.remove(id);
    deleted++;
  }

  const listed = await api.listSessions();
  const remote = new Map(listed.sessions.map((summary) => [summary.id, summary]));
  const local = await store.list();
  let uploaded = 0;
  let downloaded = 0;
  let removed = 0;
  let refused = 0;
  // Once the cloud says the account is full (ADR-63), no new session is offered to it in this pass;
  // the rest of the pass still runs, and the failure is reported at its end.
  let full = false;

  for (const record of local) {
    if (!belongsTo(record, owner, others)) continue;
    const summary = remote.get(record.id);
    if (summary === undefined) {
      if (marks.has(record.id)) {
        // A list cut short leaves out older sessions: missing from it does not mean deleted elsewhere.
        if (listed.truncated) continue;
        await store.delete(record.id);
        marks.remove(record.id);
        removed++;
      } else if (!setAside.has(record.id) && !full) {
        const outcome = await sendNew(api, record, setAside);
        if (outcome === 'sent') {
          marks.add(record.id);
          if (record.ownerId === undefined) await store.setOwner(record.id, owner);
          uploaded++;
        } else if (outcome === 'set_aside') {
          refused++;
        } else {
          full = true;
        }
      }
      continue;
    }
    marks.add(record.id);
    if (record.ownerId === undefined) await store.setOwner(record.id, owner);
    if (record.ratingAfter !== null && record.ratingAfter !== summary.ratingAfter && !setAside.has(record.id)) {
      if (await sendOrSetAside(api, record, setAside)) uploaded++;
      else refused++;
    } else if (record.ratingAfter === null && summary.ratingAfter !== null) {
      await store.setRatingAfter(record.id, summary.ratingAfter);
      downloaded++;
    }
  }

  const known = new Set(local.map((record) => record.id));
  for (const id of remote.keys()) {
    if (known.has(id)) continue;
    const record = await api.getSession(id);
    // Deleted between the list and this request: nothing to bring.
    if (record === null) continue;
    await store.save({ ...record, ownerId: owner });
    marks.add(id);
    downloaded++;
  }

  if (full) throw new CloudError('limit_reached');
  return { uploaded, downloaded, removed, deleted, setAside: refused };
}
