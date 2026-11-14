import { isTrialSource } from '../acquisition/sourceTraits';
import { worthKeeping } from './retentionPolicy';
import { readSessionRecord, type SessionRecord } from './sessionRecord';

/**
 * What is kept of a session still open, in case the page is closed before it
 * ends (ADR-62). `record` is the session as it would be saved at `savedAt`,
 * with the account that started it as `ownerId`; its id is the session's own,
 * so saving it twice stores it once.
 */
export interface SessionDraft {
  readonly id: string;
  readonly ownerId: string;
  /** ISO 8601 instant of the last write. */
  readonly savedAt: string;
  readonly record: SessionRecord;
}

/** How often an open session is written down while it lasts; also on `pagehide`. */
export const DRAFT_SAVE_PERIOD_MS = 15_000;

/** A draft older than this is no longer offered and is removed (decision of 14 nov 2026). */
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** The draft of `record`, written now by `ownerId`. */
export function draftOf(record: SessionRecord, ownerId: string, now: Date): SessionDraft {
  return { id: record.id, ownerId, savedAt: now.toISOString(), record: { ...record, ownerId } };
}

/** Checks what storage returned: it can be edited or left over from another version. */
export function readSessionDraft(value: unknown): SessionDraft | null {
  if (typeof value !== 'object' || value === null) return null;
  const { id, ownerId, savedAt, record } = value as Record<string, unknown>;
  if (typeof id !== 'string' || typeof ownerId !== 'string' || ownerId === '' || typeof savedAt !== 'string') return null;
  if (Number.isNaN(Date.parse(savedAt))) return null;
  const session = readSessionRecord(record);
  if (session === null || session.id !== id || session.ownerId !== ownerId) return null;
  return { id, ownerId, savedAt, record: session };
}

export function isExpired(draft: SessionDraft, now: Date): boolean {
  return now.getTime() - Date.parse(draft.savedAt) > DRAFT_MAX_AGE_MS;
}

/**
 * Whether an open session is worth a draft at all: one made with a source
 * that measures nobody is never kept, open or finished.
 */
export function draftable(record: SessionRecord): boolean {
  return !isTrialSource(record.sourceKind);
}

/** What to do with the drafts of this device for the account `owner`. */
export interface DraftTriage {
  /** The newest one of `owner` that would be kept as a session, to offer. */
  readonly offer: SessionDraft | null;
  /** Expired drafts of anyone, and those of `owner` that hold nothing worth keeping. */
  readonly discard: readonly string[];
}

/**
 * Sorts the drafts found when the app opens: only the account that started a
 * session is offered it, never another one, and nothing past 24 hours.
 */
export function triageDrafts(drafts: readonly SessionDraft[], owner: string, now: Date): DraftTriage {
  const discard: string[] = [];
  let offer: SessionDraft | null = null;
  for (const draft of drafts) {
    if (isExpired(draft, now)) {
      discard.push(draft.id);
      continue;
    }
    if (draft.ownerId !== owner) continue;
    if (!draftable(draft.record) || !worthKeeping(draft.record)) {
      discard.push(draft.id);
      continue;
    }
    if (offer === null || draft.savedAt > offer.savedAt) offer = draft;
  }
  return { offer, discard };
}
