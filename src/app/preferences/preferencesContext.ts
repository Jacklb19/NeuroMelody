import { createContext, useContext } from 'react';
import { DEFAULT_LOCALE, type Locale } from '../../i18n/locale';
import { DEFAULT_THEME_PREFERENCE, type Theme, type ThemePreference } from './preferences';

export interface Preferences {
  readonly themePreference: ThemePreference;
  /** The theme in effect, after resolving "like the system". */
  readonly theme: Theme;
  readonly setThemePreference: (preference: ThemePreference) => void;
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
}

/** Without a provider (isolated components, tests) the defaults apply and choices do nothing. */
export const PreferencesContext = createContext<Preferences>({
  themePreference: DEFAULT_THEME_PREFERENCE,
  theme: 'dark',
  setThemePreference: () => undefined,
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
});

export function usePreferences(): Preferences {
  return useContext(PreferencesContext);
}
