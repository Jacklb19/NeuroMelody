import { useId } from 'react';
import { LOCALES, type Locale } from '../../i18n/locale';
import { useMessages } from '../../i18n/messages';
import { GlobeIcon, MonitorIcon, MoonIcon, SunIcon } from '../../shared/icons';
import { THEME_PREFERENCES, type ThemePreference } from './preferences';
import { usePreferences } from './preferencesContext';
import './preferences.css';

/** Icon of each theme choice; keys mirror `ThemePreference`. */
const THEME_ICONS: Readonly<Record<ThemePreference, typeof SunIcon>> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

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

/**
 * The same choices in full, for the profile: one row each for the theme (with
 * "like the system") and the language, every option visible as a segment.
 * The segments are native radio buttons, so the arrow keys move between them.
 */
export function PreferencePickers(): React.JSX.Element {
  const copy = useMessages().app.settings;
  const { theme, themePreference, setThemePreference, locale, setLocale } = usePreferences();
  const ids = { theme: useId(), language: useId() };
  const themeNames: Readonly<Record<ThemePreference, string>> = copy.theme.options;
  const languageNames: Readonly<Record<Locale, string>> = copy.language.names;

  return (
    <>
      <div className="setting-row preference-row">
        <span className="icon-badge">{theme === 'dark' ? <MoonIcon /> : <SunIcon />}</span>
        <span className="preference-name" id={ids.theme}>{copy.theme.label}</span>
        <div className="segmented" role="radiogroup" aria-labelledby={ids.theme}>
          {THEME_PREFERENCES.map((option) => {
            const OptionIcon = THEME_ICONS[option];
            return (
              <label key={option} className="segment">
                <input
                  type="radio"
                  name={ids.theme}
                  checked={option === themePreference}
                  onChange={() => { setThemePreference(option); }}
                />
                <OptionIcon />
                <span>{themeNames[option]}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="setting-row preference-row">
        <span className="icon-badge"><GlobeIcon /></span>
        <span className="preference-name" id={ids.language}>{copy.language.label}</span>
        <div className="segmented" role="radiogroup" aria-labelledby={ids.language}>
          {LOCALES.map((option) => (
            <label key={option} className="segment">
              <input
                type="radio"
                name={ids.language}
                checked={option === locale}
                onChange={() => { setLocale(option); }}
              />
              <span lang={option}>{languageNames[option]}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
