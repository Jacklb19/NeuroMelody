import { describe, expect, it } from 'vitest';
import { sessionRecord } from '../../test/sessionRecords';
import { MemorySessionStore, SessionStoreError } from './sessionStore';

const OLDER = sessionRecord({ id: '017f22e2-79b0-7000-8000-000000000001', startedAt: '2026-10-06T10:00:00.000Z', endedAt: '2026-10-06T10:20:00.000Z' });
const NEWER = sessionRecord({ id: '017f22e2-79b0-7000-8000-000000000002', startedAt: '2026-10-07T10:00:00.000Z', endedAt: '2026-10-07T10:20:00.000Z' });

describe('MemorySessionStore', () => {
  it('lists saved sessions newest first', async () => {
    const store = new MemorySessionStore();
    await store.save(OLDER);
    await store.save(NEWER);
    expect((await store.list()).map((record) => record.id)).toEqual([NEWER.id, OLDER.id]);
  });

  it('refuses to save a malformed session', async () => {
    const store = new MemorySessionStore();
    await expect(store.save({ ...OLDER, ratingBefore: 11 })).rejects.toBeInstanceOf(SessionStoreError);
  });

  it('updates the rating after listening and validates it', async () => {
    const store = new MemorySessionStore();
    await store.save({ ...OLDER, ratingAfter: null });
    expect((await store.setRatingAfter(OLDER.id, 8)).ratingAfter).toBe(8);
    expect((await store.get(OLDER.id))?.ratingAfter).toBe(8);
    await expect(store.setRatingAfter(OLDER.id, 7.5)).rejects.toBeInstanceOf(SessionStoreError);
    await expect(store.setRatingAfter(NEWER.id, 5)).rejects.toBeInstanceOf(SessionStoreError);
  });

  it('deletes one session or the whole history', async () => {
    const store = new MemorySessionStore();
    await store.save(OLDER);
    await store.save(NEWER);
    await store.delete(OLDER.id);
    expect(await store.get(OLDER.id)).toBeNull();
    await store.clear();
    expect(await store.list()).toEqual([]);
  });
});
