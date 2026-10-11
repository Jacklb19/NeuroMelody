import { useCallback, useEffect, useMemo, useState } from 'react';
import { LOCALE_TAGS, type Locale } from '../../i18n/locale';
import { LocaleContext } from '../../i18n/messages';
import {
  browserStorage,
  LOCALE_STORAGE_KEY,
  readLocale,
  readThemePreference,
  resolveTheme,
  SYSTEM_DARK_QUERY,
  THEME_STORAGE_KEY,
  writePreference,
  type ThemePreference,
} from './preferences';
import { PreferencesContext } from './preferencesContext';

/** Token whose colour the browser chrome takes (the `theme-color` meta of index.html). */
const THEME_COLOR_TOKEN = '--color-background';

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(SYSTEM_DARK_QUERY).matches;
}

/**
 * Applies the theme and the language to the whole app (ADR-31): `data-theme`
 * and `lang` on the document, the dictionary through `LocaleContext`, and the
 * choices saved on the device. "Like the system" follows the system live.
 */
export function PreferencesProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const [storage] = useState(browserStorage);
  const [themePreference, setThemeState] = useState(() => readThemePreference(storage));
  const [locale, setLocaleState] = useState(() => readLocale(storage));
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const theme = resolveTheme(themePreference, systemDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(SYSTEM_DARK_QUERY);
    const update = (): void => { setSystemDark(query.matches); };
    query.addEventListener('change', update);
    return () => { query.removeEventListener('change', update); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const colour = getComputedStyle(root).getPropertyValue(THEME_COLOR_TOKEN).trim();
    if (colour !== '') document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colour);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale];
  }, [locale]);

  const setThemePreference = useCallback((preference: ThemePreference): void => {
    setThemeState(preference);
    writePreference(storage, THEME_STORAGE_KEY, preference);
  }, [storage]);

  const setLocale = useCallback((next: Locale): void => {
    setLocaleState(next);
    writePreference(storage, LOCALE_STORAGE_KEY, next);
  }, [storage]);

  const value = useMemo(
    () => ({ themePreference, theme, setThemePreference, locale, setLocale }),
    [themePreference, theme, setThemePreference, locale, setLocale],
  );

  return (
    <PreferencesContext.Provider value={value}>
      <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
    </PreferencesContext.Provider>
  );
}
