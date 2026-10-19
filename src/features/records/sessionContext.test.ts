import { describe, expect, it } from 'vitest';
import { sessionRecord } from '../../test/sessionRecords';
import { SessionRecorder } from './SessionRecorder';
import { createSessionContext, MAX_NOTE_LENGTH } from './sessionContext';
import { readSessionRecord } from './sessionRecord';
import { MemorySessionStore } from './sessionStore';

describe('local session context and notes', () => {
  const context = createSessionContext('piano', 'rain', new Date(2026, 9, 19, 23, 59));
  it('records local calendar time and actual sound choices only for new sessions', () => {
    expect(context).toEqual({ version: 1, instrument: 'piano', ambience: 'rain', localHour: 23, localDate: '2026-10-19' });
    expect(readSessionRecord(sessionRecord())?.context).toBeUndefined();
    const recorder = new SessionRecorder(() => 0);
    recorder.start({ plannedMinutes: 3, goals: ['pause'], sourceKind: 'ble', ratingBefore: null, context });
    expect(recorder.finish(180)?.context).toEqual(context);
  });

  it.each([{ version: 2 }, { localHour: 24 }, { localHour: 1.5 }, { localDate: '2026-02-30' }, { instrument: 'unknown' }, { ambience: 'unknown' }])('validates stored context: %j', (invalid) => {
    expect(readSessionRecord({ ...sessionRecord(), context: { ...context, ...invalid } })).toBeNull();
  });

  it('preserves local fields on rating and note edits, validates limits and removes text', async () => {
    const store = new MemorySessionStore();
    const record = sessionRecord({ context });
    await store.save(record);
    await store.setNote(record.id, '  A quieter moment  ');
    const rated = await store.setRatingAfter(record.id, 8);
    expect(rated).toMatchObject({ context, note: 'A quieter moment', ratingAfter: 8 });
    await expect(store.setNote(record.id, 'x'.repeat(MAX_NOTE_LENGTH + 1))).rejects.toMatchObject({ code: 'invalid_note' });
    expect((await store.setNote(record.id, '')).note).toBe('');
    await store.delete(record.id);
    await expect(store.setNote(record.id, 'hello')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('keeps concurrent note and rating changes without replacing either field', async () => {
    const store = new MemorySessionStore();
    const record = sessionRecord({ context });
    await store.save(record);
    await Promise.all([store.setNote(record.id, 'A moment'), store.setRatingAfter(record.id, 9)]);
    expect(await store.get(record.id)).toMatchObject({ context, note: 'A moment', ratingAfter: 9 });
  });
});
