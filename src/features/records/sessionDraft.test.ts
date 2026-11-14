import { describe, expect, it } from 'vitest';
import { sessionRecord } from '../../test/sessionRecords';
import { DRAFT_MAX_AGE_MS, draftOf, readSessionDraft, triageDrafts } from './sessionDraft';
import { MemorySessionDraftStore } from './sessionDraftStore';

const NOW = new Date('2026-11-14T12:00:00.000Z');
const OWNER = 'user-1';
const OTHER = 'user-2';
const id = (n: number): string => `017f22e2-79b0-7000-8000-${n.toString(16).padStart(12, '0')}`;
const minutesAgo = (minutes: number): Date => new Date(NOW.getTime() - minutes * 60_000);

describe('session drafts (ADR-62)', () => {
  it('keeps the account that started the session as the owner of its record', () => {
    const draft = draftOf(sessionRecord({ id: id(1) }), OWNER, NOW);
    expect(draft).toMatchObject({ id: id(1), ownerId: OWNER, savedAt: NOW.toISOString(), record: { ownerId: OWNER } });
    expect(readSessionDraft(draft)).toEqual(draft);
  });

  it('refuses what storage returns when it is not a draft', () => {
    const valid = draftOf(sessionRecord({ id: id(1) }), OWNER, NOW);
    expect(readSessionDraft(null)).toBeNull();
    expect(readSessionDraft({ ...valid, savedAt: 'yesterday' })).toBeNull();
    expect(readSessionDraft({ ...valid, ownerId: OTHER })).toBeNull();
    expect(readSessionDraft({ ...valid, id: id(2) })).toBeNull();
    expect(readSessionDraft({ ...valid, record: { ...valid.record, listenedSeconds: -1 } })).toBeNull();
  });

  it('offers only the newest draft of the account signed in', () => {
    const older = draftOf(sessionRecord({ id: id(1) }), OWNER, minutesAgo(30));
    const newer = draftOf(sessionRecord({ id: id(2) }), OWNER, minutesAgo(5));
    const theirs = draftOf(sessionRecord({ id: id(3) }), OTHER, minutesAgo(1));

    const { offer, discard } = triageDrafts([older, theirs, newer], OWNER, NOW);

    expect(offer?.id).toBe(id(2));
    // Another account's draft is neither offered nor removed: it waits for that account.
    expect(discard).toEqual([]);
    expect(triageDrafts([theirs], OWNER, NOW).offer).toBeNull();
  });

  it('removes drafts past 24 hours, of any account, and those with nothing worth keeping', () => {
    const expiredMine = draftOf(sessionRecord({ id: id(1) }), OWNER, new Date(NOW.getTime() - DRAFT_MAX_AGE_MS - 1));
    const expiredTheirs = draftOf(sessionRecord({ id: id(2) }), OTHER, new Date(NOW.getTime() - DRAFT_MAX_AGE_MS - 1));
    const trial = draftOf(sessionRecord({ id: id(3), sourceKind: 'simulator' }), OWNER, NOW);
    const tooShort = draftOf(sessionRecord({ id: id(4), samples: [], listenedSeconds: 20 }), OWNER, NOW);
    const justInTime = draftOf(sessionRecord({ id: id(5) }), OWNER, new Date(NOW.getTime() - DRAFT_MAX_AGE_MS));

    const { offer, discard } = triageDrafts([expiredMine, expiredTheirs, trial, tooShort, justInTime], OWNER, NOW);

    expect([...discard].sort()).toEqual([id(1), id(2), id(3), id(4)]);
    expect(offer?.id).toBe(id(5));
  });

  it('stores one draft per session and lists only valid ones', async () => {
    const store = new MemorySessionDraftStore();
    await store.put(draftOf(sessionRecord({ id: id(1), listenedSeconds: 60 }), OWNER, minutesAgo(2)));
    await store.put(draftOf(sessionRecord({ id: id(1), listenedSeconds: 75 }), OWNER, minutesAgo(1)));

    expect((await store.list()).map((draft) => draft.record.listenedSeconds)).toEqual([75]);
    await store.delete(id(1));
    await store.delete(id(1));
    expect(await store.list()).toEqual([]);
  });
});
