/**
 * Consent to sync aggregated indicators to the cloud (ADR-18). Kept on the
 * device as the instant it was given; with the API (S6.2) it is also stored
 * in `profiles`. Storage failures read as "no consent", the safe default.
 */
export const CONSENT_STORAGE_KEY = 'neuromelody.sync-consent';

export type ConsentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Browser storage; merely accessing `localStorage` can throw. */
function browserStorage(): ConsentStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The instant consent was given, or `null`. */
export function readConsent(storage: ConsentStorage | null = browserStorage()): string | null {
  try {
    const value = storage?.getItem(CONSENT_STORAGE_KEY) ?? null;
    return value !== null && !Number.isNaN(Date.parse(value)) ? value : null;
  } catch {
    return null;
  }
}

/** Stores or withdraws the consent; returns the stored instant, or `null` once withdrawn. */
export function writeConsent(given: boolean, now: Date, storage: ConsentStorage | null = browserStorage()): string | null {
  const value = given ? now.toISOString() : null;
  try {
    if (value === null) storage?.removeItem(CONSENT_STORAGE_KEY);
    else storage?.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Unavailable storage: the choice holds for this visit only.
  }
  return value;
}
