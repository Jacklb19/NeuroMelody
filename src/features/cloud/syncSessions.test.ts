import { describe, expect, it, vi } from 'vitest';
import { MemorySessionStore } from '../records/sessionStore';
import type { SessionRecord } from '../records/sessionRecord';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { CloudError, createCloudApi, fromWire, type CloudApi } from './cloudApi';
import { createMirroredSessionStore } from './mirroredSessionStore';
import { narrativeFigures } from '../summary/narrativeFigures';
import {
  createPendingDeletions,
  createSyncMarks,
  SYNC_MARKS_STORAGE_PREFIX,
  syncSessions,
  type PendingDeletions,
} from './syncSessions';

const ID_A = '017f22e2-79b0-7000-8000-00000000000a';
const ID_B = '017f22e2-79b0-7000-8000-00000000000b';
const USER = 'user-1';

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
    listSessions: () => Promise.resolve([...sessions.values()].map(({ id, ratingAfter }) => ({ id, ratingAfter }))),
    getSession: (id) => Promise.resolve(sessions.get(id) ?? null),
    deleteSession(id) {
      sessions.delete(id);
      return Promise.resolve();
    },
    deleteAccount: () => Promise.resolve(),
    suggestPlan: () => Promise.reject(new CloudError('language_model_unavailable')),
    summarizeSession: () => Promise.reject(new CloudError('language_model_unavailable')),
    sendRecording: () => Promise.resolve(),
    listSentRecordings: () => Promise.resolve([]),
    withdrawRecording: () => Promise.resolve(),
    currentClassifier: () => Promise.resolve(null),
  };
}

/** A queue of deletions that lasts for one test. */
const noDeletions = (): PendingDeletions => createPendingDeletions(null);

async function storeWith(...records: SessionRecord[]): Promise<MemorySessionStore> {
  const store = new MemorySessionStore();
  for (const record of records) await store.save(record);
  return store;
}

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & { readonly items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value); },
    removeItem: (key) => { items.delete(key); },
  };
}

describe('syncSessions', () => {
  it('uploads what only the device has and downloads what only the cloud has', async () => {
    const mine = sessionRecord({ id: ID_A, samples: [sample(5)] });
    const theirs = sessionRecord({ id: ID_B, startedAt: '2026-10-08T10:00:00.000Z', endedAt: '2026-10-08T10:20:00.000Z' });
    const store = await storeWith(mine);
    const api = fakeCloud([theirs]);
    const marks = createSyncMarks(USER, memoryStorage());

    expect(await syncSessions({ api, store, marks, deletions: noDeletions() })).toEqual({ uploaded: 1, downloaded: 1, removed: 0, deleted: 0 });
    expect(api.sessions.get(ID_A)).toEqual(mine);
    expect(await store.get(ID_B)).toEqual(theirs);
    // A second pass finds both sides equal: sending again would be harmless, but nothing is sent.
    expect(await syncSessions({ api, store, marks, deletions: noDeletions() })).toEqual({ uploaded: 0, downloaded: 0, removed: 0, deleted: 0 });
  });

  it('removes from the device a session that was sent before and is gone from the cloud', async () => {
    const store = await storeWith(sessionRecord({ id: ID_A }));
    const api = fakeCloud();
    const marks = createSyncMarks(USER, memoryStorage());
    await syncSessions({ api, store, marks, deletions: noDeletions() });

    api.sessions.delete(ID_A); // deleted from another device

    expect(await syncSessions({ api, store, marks, deletions: noDeletions() })).toEqual({ uploaded: 0, downloaded: 0, removed: 1, deleted: 0 });
    expect(await store.list()).toEqual([]);
    expect(api.sessions.size).toBe(0);
  });

  it('never deletes for one account what another account synced', async () => {
    const storage = memoryStorage();
    const store = await storeWith(sessionRecord({ id: ID_A }));
    await syncSessions({ api: fakeCloud(), store, marks: createSyncMarks(USER, storage), deletions: noDeletions() });
    expect(storage.items.has(`${SYNC_MARKS_STORAGE_PREFIX}${USER}`)).toBe(true);

    const result = await syncSessions({ api: fakeCloud(), store, marks: createSyncMarks('user-2', storage), deletions: noDeletions() });

    expect(result.removed).toBe(0);
    expect(await store.list()).toHaveLength(1);
  });

  it('makes the rating given after listening equal on both sides', async () => {
    const store = await storeWith(sessionRecord({ id: ID_A, ratingAfter: 8 }), sessionRecord({ id: ID_B, ratingAfter: null }));
    const api = fakeCloud([sessionRecord({ id: ID_A, ratingAfter: null }), sessionRecord({ id: ID_B, ratingAfter: 6 })]);

    await syncSessions({ api, store, marks: createSyncMarks(USER, memoryStorage()), deletions: noDeletions() });

    expect(api.sessions.get(ID_A)?.ratingAfter).toBe(8);
    expect((await store.get(ID_B))?.ratingAfter).toBe(6);
  });
});

describe('mirrored session store', () => {
  const setup = async (api: CloudApi | null) => {
    const local = await storeWith(sessionRecord({ id: ID_A }));
    const storage = memoryStorage();
    const marks = createSyncMarks(USER, storage);
    const deletions = createPendingDeletions(USER, storage);
    const onUploadError = vi.fn();
    const onPendingChange = vi.fn();
    const store = createMirroredSessionStore({
      local, marks: () => marks, deletions: () => deletions, cloud: () => api, onUploadError, onPendingChange,
    });
    return { local, marks, deletions, storage, store, onUploadError, onPendingChange };
  };

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
    await expect(syncSessions({ api: { ...offline, listSessions: () => cloudCopy.listSessions() }, store: local, marks, deletions }))
      .rejects.toBeInstanceOf(CloudError);
    expect(await local.list()).toEqual([]);

    // With a connection again the deletion is delivered first.
    const result = await syncSessions({ api: cloudCopy, store: local, marks, deletions });
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
    await syncSessions({ api: online, store: local, marks, deletions });
    await syncSessions({ api: online, store: local, marks, deletions });

    // The session of the setup and the new one, each sent by the first pass only.
    expect(saveSession.mock.calls.map(([record]) => record.id).sort()).toEqual([ID_A, ID_B].sort());
    expect(cloudCopy.sessions.size).toBe(2);
  });

  it('works on the device alone while syncing is off', async () => {
    const { local, store } = await setup(null);

    await store.clear();

    expect(await local.list()).toEqual([]);
  });
});

describe('cloud API client', () => {
  const record = sessionRecord({ id: ID_A, goals: ['relax'], samples: [sample(5, { lfHfRatio: null, estimatedState: null })] });

  it('sends the session with the token and reads back the same record', async () => {
    let sent: { url: string; init: RequestInit } | null = null;
    const api = createCloudApi({
      baseUrl: 'https://api.example.test',
      accessToken: () => Promise.resolve('token-1'),
      fetch: (input, init) => {
        sent = { url: input instanceof Request ? input.url : input.toString(), init: init ?? {} };
        return Promise.resolve(new Response(JSON.stringify({ id: ID_A, created: true }), { status: 201 }));
      },
    });

    await api.saveSession(record);

    expect(sent).not.toBeNull();
    const { url, init } = sent as unknown as { url: string; init: RequestInit };
    expect(url).toBe('https://api.example.test/v1/sessions');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-1');
    const wire: unknown = JSON.parse(typeof init.body === 'string' ? init.body : '');
    // The API answers instants with another notation; the record must come back identical.
    expect(fromWire({ ...(wire as object), started_at: '2026-10-07T10:00:00+00:00' })).toEqual(record);
  });

  it('turns the answers of the API into error codes and never trusts a malformed session', async () => {
    const answering = (status: number, body: unknown): CloudApi => createCloudApi({
      baseUrl: 'https://api.example.test',
      accessToken: () => Promise.resolve('token-1'),
      fetch: () => Promise.resolve(new Response(JSON.stringify(body), { status })),
    });

    await expect(answering(403, { code: 'second_factor_required' }).listSessions()).rejects.toMatchObject({ code: 'second_factor_required' });
    await expect(answering(500, '<html>').listSessions()).rejects.toMatchObject({ code: 'unknown' });
    await expect(answering(200, { id: ID_A, samples: [{ second: -1 }] }).getSession(ID_A)).rejects.toMatchObject({ code: 'unknown' });
    expect(await answering(404, { code: 'not_found' }).getSession(ID_A)).toBeNull();
    await expect(answering(404, { code: 'not_found' }).deleteSession(ID_A)).resolves.toBeUndefined();
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
    const plan = { duration_minutes: 30, note: ' Media hora va bien. ', generated: true, model: 'm' };

    expect(await answering(plan).suggestPlan(['relax'], 22, 'es')).toEqual({ durationMin: 30, note: 'Media hora va bien.' });
    expect(sent[0]).toEqual({ url: 'https://api.example.test/v1/plans/suggest', body: { goals: ['relax'], local_hour: 22, locale: 'es' } });
    // A length the app does not offer, or a text not marked as generated, is not shown.
    await expect(answering({ ...plan, duration_minutes: 25 }).suggestPlan(['relax'], 22, 'es')).rejects.toMatchObject({ code: 'unknown' });
    await expect(answering({ ...plan, generated: false }).suggestPlan(['relax'], 22, 'es')).rejects.toMatchObject({ code: 'unknown' });

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
