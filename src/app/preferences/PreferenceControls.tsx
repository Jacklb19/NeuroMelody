import { useId } from 'react';
import { LOCALES, type Locale } from '../../i18n/locale';
import { useMessages } from '../../i18n/messages';
import { MoonIcon, SunIcon } from '../../shared/icons';
import { parseOption } from '../../shared/parseOption';
import { DEFAULT_THEME_PREFERENCE, THEME_PREFERENCES, type ThemePreference } from './preferences';
import { usePreferences } from './preferencesContext';
import './preferences.css';

/**
 * Compact controls for the headers: one button flips light and dark, the
 * other moves to the next language and shows the current one.
 */
export function QuickPreferences(): React.JSX.Element {
  const copy = useMessages().app.settings;
  const { theme, setThemePreference, locale, setLocale } = usePreferences();
  const otherTheme = theme === 'dark' ? 'light' : 'dark';
  const nextLocale = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length] ?? locale;
  const languageNames: Readonly<Record<Locale, string>> = copy.language.names;

  return (
    <div className="quick-preferences">
      <button
        type="button"
        className="icon-button"
        aria-label={copy.theme.switchTo[otherTheme]}
        onClick={() => { setThemePreference(otherTheme); }}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
      <button
        type="button"
        className="icon-button language-button"
        aria-label={copy.language.switchTo(languageNames[nextLocale])}
        lang={nextLocale}
        onClick={() => { setLocale(nextLocale); }}
      >
        {locale.toUpperCase()}
      </button>
    </div>
  );
}

/** The same choices in full, for the profile: theme (with "like the system") and language. */
export function PreferenceSelects(): React.JSX.Element {
  const copy = useMessages().app.settings;
  const { themePreference, setThemePreference, locale, setLocale } = usePreferences();
  const ids = { theme: useId(), language: useId() };
  const themeNames: Readonly<Record<ThemePreference, string>> = copy.theme.options;
  const languageNames: Readonly<Record<Locale, string>> = copy.language.names;

  return (
    <div className="preference-selects">
      <label htmlFor={ids.theme}>{copy.theme.label}</label>
      <select
        id={ids.theme}
        value={themePreference}
        onChange={(event) => { setThemePreference(parseOption(THEME_PREFERENCES, event.target.value, DEFAULT_THEME_PREFERENCE)); }}
      >
        {THEME_PREFERENCES.map((option) => <option key={option} value={option}>{themeNames[option]}</option>)}
      </select>
      <label htmlFor={ids.language}>{copy.language.label}</label>
      <select
        id={ids.language}
        value={locale}
        onChange={(event) => { setLocale(parseOption(LOCALES, event.target.value, locale)); }}
      >
        {LOCALES.map((option) => <option key={option} value={option} lang={option}>{languageNames[option]}</option>)}
      </select>
    </div>
  );
}
