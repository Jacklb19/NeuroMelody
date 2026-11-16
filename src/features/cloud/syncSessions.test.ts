import { describe, expect, it, vi } from 'vitest';
import { MemorySessionStore } from '../records/sessionStore';
import type { SessionRecord } from '../records/sessionRecord';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { CLOUD_SESSION_LIST_LIMIT, CloudError, createCloudApi, fromWire, type CloudApi } from './cloudApi';
import { claimUnownedSessions, createMirroredSessionStore } from './mirroredSessionStore';
import { accountStorageKeys, removeAccountStorage } from './accountStorage';
import { narrativeFigures } from '../summary/narrativeFigures';
import { createSessionContext } from '../records/sessionContext';
import {
  createPendingDeletions,
  createSetAsideSessions,
  createSyncMarks,
  markedByOtherAccounts,
  SET_ASIDE_STORAGE_PREFIX,
  SYNC_MARKS_STORAGE_PREFIX,
  syncSessions,
  type PendingDeletions,
} from './syncSessions';

const ID_A = '017f22e2-79b0-7000-8000-00000000000a';
const ID_B = '017f22e2-79b0-7000-8000-00000000000b';
const ID_C = '017f22e2-79b0-7000-8000-00000000000c';
const USER = 'user-1';
const OTHER = 'user-2';
/** No other account has used this device. */
const NOBODY_ELSE: ReadonlySet<string> = new Set();

/** A cloud in memory that behaves like the API: idempotent saves that only update the later rating. */
function fakeCloud(initial: readonly SessionRecord[] = []): CloudApi & { readonly sessions: Map<string, SessionRecord> } {
  const sessions = new Map(initial.map((record) => [record.id, record]));
  return {
    sessions,
    saveSession(record) {
      const stored = sessions.get(record.id);
      sessions.set(record.id, stored === undefined ? record : { ...stored, ratingAfter: record.ratingAfter ?? stored.ratingAfter });
      return Promise.resolve();
    },
    listSessions: () => Promise.resolve({ sessions: [...sessions.values()].map(({ id, ratingAfter }) => ({ id, ratingAfter })), truncated: false }),
    getSession: (id) => Promise.resolve(sessions.get(id) ?? null),
    deleteSession(id) {
      sessions.delete(id);
      return Promise.resolve();
    },
    deleteAccount: () => Promise.resolve(),
    composePlan: () => Promise.reject(new CloudError('language_model_unavailable')),
    summarizeSession: () => Promise.reject(new CloudError('language_model_unavailable')),
    summarizeProgress: () => Promise.reject(new CloudError('language_model_unavailable')),
    sendRecording: () => Promise.resolve(),
    listSentRecordings: () => Promise.resolve([]),
    withdrawRecording: () => Promise.resolve(),
    currentClassifier: () => Promise.resolve(null),
    listMelodies: () => Promise.resolve([]),
    saveMelody: () => Promise.resolve(),
    deleteMelody: () => Promise.resolve(),
  };
}

/** A queue of deletions that lasts for one test. */
const noDeletions = (): PendingDeletions => createPendingDeletions(null);

async function storeWith(...records: SessionRecord[]): Promise<MemorySessionStore> {
  const store = new MemorySessionStore();
  for (const record of records) await store.save(record);
  return store;
}

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'> & { readonly items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    get length() { return items.size; },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value); },
    removeItem: (key) => { items.delete(key); },
  };
}

describe('syncSessions', () => {
  it('preserves local context and notes when a remote rating arrives', async () => {
    const context = createSessionContext('piano', 'rain');
    const record = sessionRecord({ context, note: 'local only', ratingAfter: null });
    const store = await storeWith(record);
    const api = fakeCloud([sessionRecord({ ratingAfter: 9 })]);
    await syncSessions({ api, store, marks: createSyncMarks(USER, memoryStorage()), deletions: noDeletions(), owner: USER, others: NOBODY_ELSE });
    expect(await store.get(record.id)).toMatchObject({ context, note: 'local only', ratingAfter: 9 });
  });
  it('uploads what only the device has and downloads what only the cloud has', async () => {
    const mine = sessionRecord({ id: ID_A, samples: [sample(5)] });
    const theirs = sessionRecord({ id: ID_B, startedAt: '2026-10-08T10:00:00.000Z', endedAt: '2026-10-08T10:20:00.000Z' });
    const store = await storeWith(mine);
    const api = fakeCloud([theirs]);
    const marks = createSyncMarks(USER, memoryStorage());

    expect(await syncSessions({ api, store, marks, deletions: noDeletions(), owner: USER, others: NOBODY_ELSE })).toEqual({ uploaded: 1, downloaded: 1, removed: 0, deleted: 0, setAside: 0 });
    expect(api.sessions.get(ID_A)).toEqual(mine);
    // Brought from this account's cloud, it belongs to this account on the device.
    expect(await store.get(ID_B)).toEqual({ ...theirs, ownerId: USER });
    // A second pass finds both sides equal: sending again would be harmless, but nothing is sent.
    expect(await syncSessions({ api, store, marks, deletions: noDeletions(), owner: USER, others: NOBODY_ELSE })).toEqual({ uploaded: 0, downloaded: 0, removed: 0, deleted: 0, setAside: 0 });
  });

  it('removes from the device a session that was sent before and is gone from the cloud', async () => {
    const store = await storeWith(sessionRecord({ id: ID_A }));
    const api = fakeCloud();
    const marks = createSyncMarks(USER, memoryStorage());
    await syncSessions({ api, store, marks, deletions: noDeletions(), owner: USER, others: NOBODY_ELSE });

    api.sessions.delete(ID_A); // deleted from another device

    expect(await syncSessions({ api, store, marks, deletions: noDeletions(), owner: USER, others: NOBODY_ELSE })).toEqual({ uploaded: 0, downloaded: 0, removed: 1, deleted: 0, setAside: 0 });
    expect(await store.list()).toEqual([]);
    expect(api.sessions.size).toBe(0);
  });

  it('never deletes for one account what another account synced', async () => {
    const storage = memoryStorage();
    const store = await storeWith(sessionRecord({ id: ID_A }));
    await syncSessions({ api: fakeCloud(), store, marks: createSyncMarks(USER, storage), deletions: noDeletions(), owner: USER, others: NOBODY_ELSE });
    expect(storage.items.has(`${SYNC_MARKS_STORAGE_PREFIX}${USER}`)).toBe(true);

    const otherCloud = fakeCloud();
    const result = await syncSessions({ api: otherCloud, store, marks: createSyncMarks(OTHER, storage), deletions: noDeletions(), owner: OTHER, others: markedByOtherAccounts(OTHER, storage) });

    expect(result).toEqual({ uploaded: 0, downloaded: 0, removed: 0, deleted: 0, setAside: 0 });
    expect(await store.list()).toHaveLength(1);
    expect(otherCloud.sessions.size).toBe(0);
  });

  it('never sends the sessions of one account to the cloud of another, and gives a session without an account to the first that syncs it', async () => {
    const storage = memoryStorage();
    // A session of the first account; another saved before owners existed, known only by that account's marks;
    // and one made without an account.
    createSyncMarks(USER, storage).add(ID_B);
    const store = await storeWith(sessionRecord({ id: ID_A, ownerId: USER }), sessionRecord({ id: ID_B }), sessionRecord({ id: ID_C }));
    const otherCloud = fakeCloud();

    const result = await syncSessions({ api: otherCloud, store, marks: createSyncMarks(OTHER, storage), deletions: noDeletions(), owner: OTHER, others: markedByOtherAccounts(OTHER, storage) });

    expect(result.uploaded).toBe(1);
    expect([...otherCloud.sessions.keys()]).toEqual([ID_C]);
    expect((await store.get(ID_C))?.ownerId).toBe(OTHER);
    expect((await store.get(ID_A))?.ownerId).toBe(USER);
    expect((await store.get(ID_B))?.ownerId).toBeUndefined();
  });

  it('removes nothing from the device when the cloud has more sessions than its list returns', async () => {
    const idOf = (index: number): string => `017f22e2-79b0-7000-8000-${index.toString(16).padStart(12, '0')}`;
    const records = Array.from({ length: CLOUD_SESSION_LIST_LIMIT + 1 }, (_, index) => sessionRecord({ id: idOf(index), ownerId: USER }));
    const store = await storeWith(...records);
    const marks = createSyncMarks(USER, memoryStorage());
    for (const record of records) marks.add(record.id);
    const cloud = fakeCloud(records);
    // Like the API: the newest sessions up to the limit, and a flag for the ones left out.
    const api: CloudApi = {
      ...cloud,
      listSessions: async () => {
        const all = (await cloud.listSessions()).sessions;
        return { sessions: all.slice(0, CLOUD_SESSION_LIST_LIMIT), truncated: all.length > CLOUD_SESSION_LIST_LIMIT };
      },
    };

    const result = await syncSessions({ api, store, marks, deletions: noDeletions(), owner: USER, others: NOBODY_ELSE });

    expect(result).toMatchObject({ removed: 0, uploaded: 0, downloaded: 0 });
    expect(await store.list()).toHaveLength(CLOUD_SESSION_LIST_LIMIT + 1);
    expect(marks.has(idOf(CLOUD_SESSION_LIST_LIMIT))).toBe(true);
  });

  it('makes the rating given after listening equal on both sides', async () => {
    const store = await storeWith(sessionRecord({ id: ID_A, ratingAfter: 8 }), sessionRecord({ id: ID_B, ratingAfter: null }));
    const api = fakeCloud([sessionRecord({ id: ID_A, ratingAfter: null }), sessionRecord({ id: ID_B, ratingAfter: 6 })]);

    await syncSessions({ api, store, marks: createSyncMarks(USER, memoryStorage()), deletions: noDeletions(), owner: USER, others: NOBODY_ELSE });

    expect(api.sessions.get(ID_A)?.ratingAfter).toBe(8);
    expect((await store.get(ID_B))?.ratingAfter).toBe(6);
  });
});

describe('syncSessions with sessions the cloud refuses', () => {
  /** A cloud that refuses one session with `code` and stores the rest. */
  function refusing(id: string, code: 'invalid_request' | 'session_conflict' | 'network' | 'limit_reached', initial: readonly SessionRecord[] = []) {
    const cloud = fakeCloud(initial);
    const sent: string[] = [];
    const save = cloud.saveSession.bind(cloud);
    cloud.saveSession = (record) => {
      sent.push(record.id);
      return record.id === id ? Promise.reject(new CloudError(code)) : save(record);
    };
    return { cloud, sent };
  }

  it('sets an invalid session aside and still uploads the two around it', async () => {
    const store = await storeWith(sessionRecord({ id: ID_A }), sessionRecord({ id: ID_B }), sessionRecord({ id: ID_C }));
    const { cloud, sent } = refusing(ID_B, 'invalid_request');
    const marks = createSyncMarks(USER, memoryStorage());
    const setAside = createSetAsideSessions(USER, memoryStorage());

    const result = await syncSessions({ api: cloud, store, marks, deletions: noDeletions(), setAside, owner: USER, others: NOBODY_ELSE });

    expect(result).toEqual({ uploaded: 2, downloaded: 0, removed: 0, deleted: 0, setAside: 1 });
    expect([...cloud.sessions.keys()].sort()).toEqual([ID_A, ID_C]);
    expect(setAside.has(ID_B)).toBe(true);
    // It stays on the device, unmarked, so no later pass reads it as deleted elsewhere.
    expect(marks.has(ID_B)).toBe(false);
    expect(await store.get(ID_B)).not.toBeNull();

    // The next pass does not send it again.
    sent.length = 0;
    expect(await syncSessions({ api: cloud, store, marks, deletions: noDeletions(), setAside, owner: USER, others: NOBODY_ELSE }))
      .toEqual({ uploaded: 0, downloaded: 0, removed: 0, deleted: 0, setAside: 0 });
    expect(sent).toEqual([]);
    expect(await store.get(ID_B)).not.toBeNull();
  });

  it('sets aside a session whose id is already taken', async () => {
    const store = await storeWith(sessionRecord({ id: ID_A }), sessionRecord({ id: ID_B }));
    const { cloud } = refusing(ID_A, 'session_conflict');
    const setAside = createSetAsideSessions(USER, memoryStorage());

    const result = await syncSessions({ api: cloud, store, marks: createSyncMarks(USER, memoryStorage()), deletions: noDeletions(), setAside, owner: USER, others: NOBODY_ELSE });

    expect(result).toMatchObject({ uploaded: 1, setAside: 1 });
    expect(setAside.has(ID_A)).toBe(true);
  });

  it('stops the pass on a network failure and sets nothing aside', async () => {
    const store = await storeWith(sessionRecord({ id: ID_A }), sessionRecord({ id: ID_B }));
    const { cloud } = refusing(ID_A, 'network');
    const setAside = createSetAsideSessions(USER, memoryStorage());

    await expect(syncSessions({ api: cloud, store, marks: createSyncMarks(USER, memoryStorage()), deletions: noDeletions(), setAside, owner: USER, others: NOBODY_ELSE }))
      .rejects.toMatchObject({ code: 'network' });
    expect(setAside.size).toBe(0);
  });

  it('with the account full it sends nothing new, still brings what the cloud has, and says so at the end (ADR-63)', async () => {
    const theirs = sessionRecord({ id: ID_C, startedAt: '2026-10-08T10:00:00.000Z', endedAt: '2026-10-08T10:20:00.000Z' });
    const store = await storeWith(sessionRecord({ id: ID_A }), sessionRecord({ id: ID_B }));
    const { cloud, sent } = refusing(ID_A, 'limit_reached', [theirs]);
    // Every new session is refused once the account is full.
    const save = cloud.saveSession.bind(cloud);
    cloud.saveSession = (record) => (record.id === ID_B ? Promise.reject(new CloudError('limit_reached')) : save(record));
    const setAside = createSetAsideSessions(USER, memoryStorage());

    await expect(syncSessions({ api: cloud, store, marks: createSyncMarks(USER, memoryStorage()), deletions: noDeletions(), setAside, owner: USER, others: NOBODY_ELSE }))
      .rejects.toMatchObject({ code: 'limit_reached' });

    // Nothing is set aside: once there is room, the sessions go up.
    expect(setAside.size).toBe(0);
    // After the first refusal no other new session is offered in this pass.
    expect(sent).toHaveLength(1);
    expect(await store.get(ID_C)).not.toBeNull();
    expect(await store.list()).toHaveLength(3);
  });

  it('does not resend a refused rating on every pass', async () => {
    const store = await storeWith(sessionRecord({ id: ID_A, ratingAfter: 8 }));
    const { cloud, sent } = refusing(ID_A, 'invalid_request', [sessionRecord({ id: ID_A, ratingAfter: null })]);
    const setAside = createSetAsideSessions(USER, memoryStorage());
    const marks = createSyncMarks(USER, memoryStorage());

    expect(await syncSessions({ api: cloud, store, marks, deletions: noDeletions(), setAside, owner: USER, others: NOBODY_ELSE })).toMatchObject({ setAside: 1 });
    sent.length = 0;
    await syncSessions({ api: cloud, store, marks, deletions: noDeletions(), setAside, owner: USER, others: NOBODY_ELSE });
    expect(sent).toEqual([]);
  });

  it('keeps the set-aside sessions per account across visits', () => {
    const storage = memoryStorage();
    createSetAsideSessions(USER, storage).add(ID_A);

    expect(createSetAsideSessions(USER, storage).has(ID_A)).toBe(true);
    expect(createSetAsideSessions(OTHER, storage).has(ID_A)).toBe(false);
    expect(storage.items.has(`${SET_ASIDE_STORAGE_PREFIX}${USER}`)).toBe(true);
  });
});

describe('mirrored session store', () => {
  const setup = async (api: CloudApi | null, owner: string | null = USER) => {
    const local = await storeWith(sessionRecord({ id: ID_A }));
    const storage = memoryStorage();
    const marks = createSyncMarks(USER, storage);
    const deletions = createPendingDeletions(USER, storage);
    const onUploadError = vi.fn();
    const onPendingChange = vi.fn();
    const store = createMirroredSessionStore({
      local, owner, marks: () => marks, deletions: () => deletions, cloud: () => api, onUploadError, onPendingChange,
    });
    return { local, marks, deletions, storage, store, onUploadError, onPendingChange };
  };

  it('keeps note edits local without starting an upload', async () => {
    const api = fakeCloud();
    const saveSession = vi.spyOn(api, 'saveSession');
    const { local, store } = await setup(api);
    await store.setNote(ID_A, 'A private note');
    expect((await local.get(ID_A))?.note).toBe('A private note');
    expect(saveSession).not.toHaveBeenCalled();
  });

  it('keeps the session on the device when the upload fails, and reports it', async () => {
    const api: CloudApi = { ...fakeCloud(), saveSession: () => Promise.reject(new CloudError('network')) };
    const { local, store, onUploadError } = await setup(api);

    await store.save(sessionRecord({ id: ID_B }));

    expect(await local.get(ID_B)).not.toBeNull();
    await vi.waitFor(() => { expect(onUploadError).toHaveBeenCalledOnce(); });
  });

  it('deletes on the device without a connection and delivers the deletion later, so the session does not come back', async () => {
    const cloudCopy = fakeCloud([sessionRecord({ id: ID_A })]);
    const offline: CloudApi = { ...cloudCopy, deleteSession: () => Promise.reject(new CloudError('network')) };
    const { local, marks, deletions, storage, store, onPendingChange } = await setup(offline);
    marks.add(ID_A);

    await store.delete(ID_A);

    // Gone from the device at once; the cloud still has it and the deletion waits, kept across restarts.
    expect(await local.get(ID_A)).toBeNull();
    expect(deletions.list()).toEqual([ID_A]);
    expect(createPendingDeletions(USER, storage).list()).toEqual([ID_A]);
    expect(onPendingChange).toHaveBeenCalledOnce();
    // Still without a connection: the pass stops before reading the cloud, so nothing is downloaded back.
    await expect(syncSessions({ api: { ...offline, listSessions: () => cloudCopy.listSessions() }, store: local, marks, deletions, owner: USER, others: NOBODY_ELSE }))
      .rejects.toBeInstanceOf(CloudError);
    expect(await local.list()).toEqual([]);

    // With a connection again the deletion is delivered first.
    const result = await syncSessions({ api: cloudCopy, store: local, marks, deletions, owner: USER, others: NOBODY_ELSE });
    expect(result).toMatchObject({ deleted: 1, downloaded: 0 });
    expect(cloudCopy.sessions.has(ID_A)).toBe(false);
    expect(deletions.size).toBe(0);
    expect(await local.list()).toEqual([]);
  });

  it('queues nothing for a session that was never sent or once the cloud confirms the deletion', async () => {
    const api = fakeCloud([sessionRecord({ id: ID_A })]);
    const { local, marks, deletions, store } = await setup(api);

    await store.save(sessionRecord({ id: ID_B }));
    await vi.waitFor(() => { expect(marks.has(ID_B)).toBe(true); });
    marks.remove(ID_B);
    await store.delete(ID_B);
    marks.add(ID_A);
    await store.delete(ID_A);

    expect(deletions.size).toBe(0);
    expect(api.sessions.has(ID_A)).toBe(false);
    expect(await local.list()).toEqual([]);
  });

  it('sends a session saved without a connection exactly once when the connection returns', async () => {
    const cloudCopy = fakeCloud();
    const saveSession = vi.fn((record: SessionRecord) => cloudCopy.saveSession(record));
    const offline: CloudApi = { ...cloudCopy, saveSession: () => Promise.reject(new CloudError('network')) };
    const { local, marks, deletions, store, onUploadError } = await setup(offline);

    await store.save(sessionRecord({ id: ID_B }));
    await vi.waitFor(() => { expect(onUploadError).toHaveBeenCalledOnce(); });

    const online = { ...cloudCopy, saveSession };
    await syncSessions({ api: online, store: local, marks, deletions, owner: USER, others: NOBODY_ELSE });
    await syncSessions({ api: online, store: local, marks, deletions, owner: USER, others: NOBODY_ELSE });

    // The session of the setup and the new one, each sent by the first pass only.
    expect(saveSession.mock.calls.map(([record]) => record.id).sort()).toEqual([ID_A, ID_B].sort());
    expect(cloudCopy.sessions.size).toBe(2);
  });

  it('writes down the account of a new session and never uploads a session of another account', async () => {
    const api = fakeCloud();
    const saveSession = vi.spyOn(api, 'saveSession');
    const { local, store } = await setup(api, OTHER);
    await local.setOwner(ID_A, USER);

    await store.save(sessionRecord({ id: ID_B }));
    expect((await local.get(ID_B))?.ownerId).toBe(OTHER);
    await vi.waitFor(() => { expect(saveSession).toHaveBeenCalledOnce(); });

    // The first account's session does not exist for this one (ADR-61): it can neither rate it nor send it.
    await expect(store.setRatingAfter(ID_A, 7)).rejects.toMatchObject({ code: 'not_found' });
    expect((await local.get(ID_A))?.ratingAfter).toBe(sessionRecord().ratingAfter);
    expect(saveSession).toHaveBeenCalledOnce();
    expect(api.sessions.has(ID_A)).toBe(false);
  });

  it('works on the device alone while syncing is off', async () => {
    const { local, store } = await setup(null);

    await store.clear();

    expect(await local.list()).toEqual([]);
  });
});

describe('local data per account (ADR-61)', () => {
  /** The history of one device seen through the store of `owner`, without the cloud. */
  function storeOf(local: MemorySessionStore, owner: string | null) {
    return createMirroredSessionStore({
      local,
      owner,
      others: () => NOBODY_ELSE,
      marks: () => createSyncMarks(null),
      deletions: noDeletions,
      cloud: () => null,
      onUploadError: vi.fn(),
      onPendingChange: vi.fn(),
    });
  }

  it('never lets account B list, open, annotate, rate or delete a session of account A', async () => {
    const local = await storeWith(sessionRecord({ id: ID_A, ownerId: USER }), sessionRecord({ id: ID_B, ownerId: OTHER }));
    const first = storeOf(local, USER);
    const second = storeOf(local, OTHER);

    expect((await second.list()).map(({ id }) => id)).toEqual([ID_B]);
    // A direct link to A's session reads like one that does not exist.
    expect(await second.get(ID_A)).toBeNull();
    await expect(second.setNote(ID_A, 'not mine')).rejects.toMatchObject({ code: 'not_found' });
    await expect(second.setRatingAfter(ID_A, 1)).rejects.toMatchObject({ code: 'not_found' });
    await expect(second.save(sessionRecord({ id: ID_A, ownerId: OTHER }))).rejects.toMatchObject({ code: 'invalid_record' });
    await second.delete(ID_A);
    await second.clear();

    expect(await local.get(ID_A)).toEqual(sessionRecord({ id: ID_A, ownerId: USER }));
    expect((await first.list()).map(({ id }) => id)).toEqual([ID_A]);
    expect(await local.get(ID_B)).toBeNull();
  });

  it('shows nothing without an account', async () => {
    const local = await storeWith(sessionRecord({ id: ID_A, ownerId: USER }), sessionRecord({ id: ID_B }));
    expect(await storeOf(local, null).list()).toEqual([]);
    expect(await storeOf(local, null).get(ID_B)).toBeNull();
  });

  it('gives the sessions without an owner to the first account that signs in, and to no later one', async () => {
    const local = await storeWith(sessionRecord({ id: ID_A }), sessionRecord({ id: ID_B }), sessionRecord({ id: ID_C, ownerId: OTHER }));
    // ID_B is in another account's cloud: it is that account's, as in ADR-53.
    expect(await claimUnownedSessions(local, USER, new Set([ID_B]))).toBe(1);
    expect(await claimUnownedSessions(local, OTHER, NOBODY_ELSE)).toBe(1);

    expect((await local.get(ID_A))?.ownerId).toBe(USER);
    expect((await local.get(ID_B))?.ownerId).toBe(OTHER);
    expect((await storeOf(local, OTHER).list()).map(({ id }) => id).sort()).toEqual([ID_B, ID_C]);
    expect(await storeOf(local, OTHER).get(ID_A)).toBeNull();
  });

  it('removes every key this device keeps for a deleted account, and only those', () => {
    const storage = memoryStorage();
    for (const key of [...accountStorageKeys(USER), ...accountStorageKeys(OTHER)]) storage.setItem(key, '[]');

    removeAccountStorage(USER, storage);

    expect(accountStorageKeys(USER).some((key) => storage.items.has(key))).toBe(false);
    expect(accountStorageKeys(OTHER).every((key) => storage.items.has(key))).toBe(true);
  });
});

describe('cloud API client', () => {
  const record = sessionRecord({ id: ID_A, goals: ['relax'], samples: [sample(5, { lfHfRatio: null, estimatedState: null })] });

  it('sends only cloud fields with the token and reads back the public record', async () => {
    let sent: { url: string; init: RequestInit } | null = null;
    const api = createCloudApi({
      baseUrl: 'https://api.example.test',
      accessToken: () => Promise.resolve('token-1'),
      fetch: (input, init) => {
        sent = { url: input instanceof Request ? input.url : input.toString(), init: init ?? {} };
        return Promise.resolve(new Response(JSON.stringify({ id: ID_A, created: true }), { status: 201 }));
      },
    });

    await api.saveSession({ ...record, context: createSessionContext('piano', 'rain'), note: 'local note', music: { startTempoBpm: 70, endTempoBpm: 60, steps: [] } });

    expect(sent).not.toBeNull();
    const { url, init } = sent as unknown as { url: string; init: RequestInit };
    expect(url).toBe('https://api.example.test/v1/sessions');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-1');
    const wire: unknown = JSON.parse(typeof init.body === 'string' ? init.body : '');
    expect(wire).not.toHaveProperty('context');
    expect(wire).not.toHaveProperty('note');
    expect(wire).not.toHaveProperty('music');
    // The API answers instants with another notation; the record must come back identical.
    expect(fromWire({ ...(wire as object), started_at: '2026-10-07T10:00:00+00:00' })).toEqual(record);
    // Intervals are implicit both ways; only a pulse-only session says so (ADR-51).
    expect(wire).not.toHaveProperty('signal_mode');
    expect(fromWire({ ...(wire as object), signal_mode: 'hrv' })).toEqual(record);
    expect(fromWire({ ...(wire as object), signal_mode: 'hr_only' })).toEqual({ ...record, signalMode: 'hr_only' });
  });

  it('reads whether the list left older sessions out, also from an API without the flag', async () => {
    const answering = (body: unknown): CloudApi => createCloudApi({
      baseUrl: 'https://api.example.test',
      accessToken: () => Promise.resolve('token-1'),
      fetch: () => Promise.resolve(new Response(JSON.stringify(body), { status: 200 })),
    });
    const summary = { id: ID_A, rating_after: 7 };
    const full = Array.from({ length: CLOUD_SESSION_LIST_LIMIT }, () => summary);

    expect(await answering({ sessions: [summary], truncated: true }).listSessions()).toEqual({ sessions: [{ id: ID_A, ratingAfter: 7 }], truncated: true });
    expect((await answering({ sessions: [summary], truncated: false }).listSessions()).truncated).toBe(false);
    // Published before the flag: a list that reaches the limit may have been cut short.
    expect((await answering({ sessions: [summary] }).listSessions()).truncated).toBe(false);
    expect((await answering({ sessions: full }).listSessions()).truncated).toBe(true);
  });

  it('turns the answers of the API into error codes and never trusts a malformed session', async () => {
    const answering = (status: number, body: unknown): CloudApi => createCloudApi({
      baseUrl: 'https://api.example.test',
      accessToken: () => Promise.resolve('token-1'),
      fetch: () => Promise.resolve(new Response(JSON.stringify(body), { status })),
    });

    await expect(answering(403, { code: 'second_factor_required' }).listSessions()).rejects.toMatchObject({ code: 'second_factor_required' });
    await expect(answering(429, { code: 'rate_limited' }).composePlan('algo tranquilo', 22, 'es')).rejects.toMatchObject({ code: 'rate_limited' });
    await expect(answering(409, { code: 'limit_reached' }).saveSession(sessionRecord())).rejects.toMatchObject({ code: 'limit_reached' });
    await expect(answering(500, '<html>').listSessions()).rejects.toMatchObject({ code: 'unknown' });
    await expect(answering(200, { id: ID_A, samples: [{ second: -1 }] }).getSession(ID_A)).rejects.toMatchObject({ code: 'unknown' });
    expect(await answering(404, { code: 'not_found' }).getSession(ID_A)).toBeNull();
    await expect(answering(404, { code: 'not_found' }).deleteSession(ID_A)).resolves.toBeUndefined();
    await expect(answering(200, { sessions: [], truncated: 'yes' }).listSessions()).rejects.toMatchObject({ code: 'unknown' });
    const signedOut = createCloudApi({ baseUrl: 'https://api.example.test', accessToken: () => Promise.resolve(null) });
    await expect(signedOut.listSessions()).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('asks the language model through the API and shows only what came back marked as generated', async () => {
    const sent: { url: string; body: unknown }[] = [];
    const answering = (body: unknown, status = 200): CloudApi => createCloudApi({
      baseUrl: 'https://api.example.test',
      accessToken: () => Promise.resolve('token-1'),
      fetch: (input, init) => {
        sent.push({ url: typeof input === "string" ? input : "", body: JSON.parse(typeof init?.body === 'string' ? init.body : 'null') as unknown });
        return Promise.resolve(new Response(JSON.stringify(body), { status }));
      },
    });
    const plan = { goal: 'relax', duration_minutes: 30, world: 'city_rain', mode: 'fixed', note: ' Media hora de piano con lluvia. ', generated: true, model: 'm' };
    const compose = (body: unknown): Promise<unknown> => answering(body).composePlan('Estoy estudiando, algo tranquilo', 22, 'es');

    expect(await compose(plan)).toEqual({ goal: 'relax', durationMin: 30, world: 'city_rain', fixed: true, note: 'Media hora de piano con lluvia.' });
    // Pressing "send" is the consent: it travels with the text, the hour and the language, and nothing else.
    expect(sent[0]).toEqual({ url: 'https://api.example.test/v1/plans/compose', body: { consent: true, text: 'Estoy estudiando, algo tranquilo', local_hour: 22, locale: 'es' } });
    expect(await compose({ ...plan, goal: null, mode: 'adaptive', note: null })).toEqual({ goal: null, durationMin: 30, world: 'city_rain', fixed: false, note: null });
    // Anything outside the app's own catalogs, or not marked as generated, is not shown.
    for (const invented of [
      { ...plan, duration_minutes: 25 },
      { ...plan, world: 'volcano' },
      { ...plan, goal: 'become_invincible' },
      { ...plan, mode: 'loud' },
      { ...plan, note: 7 },
      { ...plan, note: 'x'.repeat(161) },
      { ...plan, model: null },
      { ...plan, model: '' },
      { ...plan, extra: 'unexpected' },
      { ...plan, generated: false },
    ]) {
      await expect(compose(invented)).rejects.toMatchObject({ code: 'unknown' });
    }

    // What the summary screen shows of this session: pulse 78 → 68, a rating before and none after.
    const figures = narrativeFigures(sessionRecord({
      goals: ['relax'],
      ratingAfter: null,
      samples: [sample(5, { meanHr: 78.4, rmssd: 20, estimatedState: null }), sample(10, { meanHr: 67.6, rmssd: 30, estimatedState: null })],
    }));
    expect(await answering({ text: 'Escuchaste 20 minutos.', generated: true, model: 'm' }).summarizeSession(ID_A, 'en', figures)).toEqual({ text: 'Escuchaste 20 minutos.' });
    // Asking is the consent, so the request says so; only whole figures and catalog values travel.
    expect(sent.at(-1)).toEqual({
      url: `https://api.example.test/v1/sessions/${ID_A}/summary`,
      body: {
        consent: true,
        locale: 'en',
        figures: {
          planned_minutes: 20,
          listened_minutes: 20,
          goals: ['relax'],
          pulse_start: 78,
          pulse_end: 68,
          variation_start: 20,
          variation_end: 30,
          minutes_by_state: null,
          rating_before: 4,
          rating_after: null,
        },
      },
    });
    await expect(answering({ text: '', generated: true }).summarizeSession(ID_A, 'en', figures)).rejects.toMatchObject({ code: 'unknown' });
    await expect(answering({ code: 'language_model_unavailable' }, 502).summarizeSession(ID_A, 'en', figures)).rejects.toMatchObject({ code: 'language_model_unavailable' });
  });
});
