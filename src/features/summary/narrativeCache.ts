import { LOCALES, type Locale } from '../../i18n/locale';

/**
 * Summaries the language model already wrote, kept on this device so
 * opening a session again does not ask for its text again (ADR-08). One per
 * session and language; the oldest are dropped past `MAX_CACHED_NARRATIVES`.
 */
export const NARRATIVE_STORAGE_KEY = 'neuromelody.narratives';

export const MAX_CACHED_NARRATIVES = 50;

interface CachedNarrative {
  readonly sessionId: string;
  readonly locale: Locale;
  readonly text: string;
}

type NarrativeStorage = Pick<Storage, 'getItem' | 'setItem'>;

function isCached(value: unknown): value is CachedNarrative {
  if (typeof value !== 'object' || value === null) return false;
  const { sessionId, locale, text } = value as Record<string, unknown>;
  return typeof sessionId === 'string' && typeof text === 'string' && text !== '' && LOCALES.some((known) => known === locale);
}

/** What is stored, validated: storage can be edited or left over from another version. */
function readAll(storage: NarrativeStorage | null): CachedNarrative[] {
  try {
    const stored: unknown = JSON.parse(storage?.getItem(NARRATIVE_STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter(isCached) : [];
  } catch {
    return [];
  }
}

export function readNarrative(storage: NarrativeStorage | null, sessionId: string, locale: Locale): string | null {
  return readAll(storage).find((entry) => entry.sessionId === sessionId && entry.locale === locale)?.text ?? null;
}

/** Keeps the text for that session and language, replacing an earlier one. Failing to store it loses nothing but the cache. */
export function writeNarrative(storage: NarrativeStorage | null, sessionId: string, locale: Locale, text: string): void {
  const others = readAll(storage).filter((entry) => entry.sessionId !== sessionId || entry.locale !== locale);
  const kept = [...others, { sessionId, locale, text }].slice(-MAX_CACHED_NARRATIVES);
  try {
    storage?.setItem(NARRATIVE_STORAGE_KEY, JSON.stringify(kept));
  } catch {
    // Without storage the summary is simply asked for again next time.
  }
}

/** The browser's storage, or `null` where it is blocked. */
export function narrativeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
