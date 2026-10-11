import { DEFAULT_LOCALE, LOCALES, type Locale } from '../../i18n/locale';
import { parseOption } from '../../shared/parseOption';

/**
 * Appearance and language the person chose (ADR-31), kept on the device.
 * Theme: follow the system or force one. Language: one of `LOCALES`.
 */
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

/** The two themes index.css defines; `data-theme` on the document selects one. */
export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = 'neuromelody.theme';
export const LOCALE_STORAGE_KEY = 'neuromelody.locale';

/** Media query that tells whether the system prefers a dark interface. */
export const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Browser storage; merely accessing `localStorage` can throw. */
export function browserStorage(): PreferenceStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(storage: PreferenceStorage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Stored values are validated like any outside input; anything else falls back to the default. */
export function readThemePreference(storage: PreferenceStorage | null): ThemePreference {
  return parseOption(THEME_PREFERENCES, read(storage, THEME_STORAGE_KEY), DEFAULT_THEME_PREFERENCE);
}

export function readLocale(storage: PreferenceStorage | null): Locale {
  return parseOption(LOCALES, read(storage, LOCALE_STORAGE_KEY), DEFAULT_LOCALE);
}

/** Saves a preference; without storage the choice holds for this visit only. */
export function writePreference(storage: PreferenceStorage | null, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Unavailable storage (private browsing): nothing else to do.
  }
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): Theme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}
