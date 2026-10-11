/** English copy of the app shell: skip link, main navigation and document titles (ADR-25). */
export const app = {
  skipToContent: 'Skip to content',
  /** Description of index.html, read by search engines and link previews. */
  shellDescription: (appName: string): string =>
    `${appName}: generative music that adapts in real time to physiological signals. A wellbeing tool, not a medical device.`,
  /** Accessible name of the main navigation landmark. */
  mainNavigation: 'Main',
  /** Labels of the main navigation; keys mirror `NAVIGATION_ITEMS`. */
  navigation: {
    home: 'Home',
    plan: 'Plan',
    session: 'Session',
    history: 'History',
  },
  /** Accessible name of the avatar that opens the profile. */
  profile: 'Profile',
  /** Appearance and language controls, in the header and the profile. */
  settings: {
    theme: {
      label: 'Theme',
      /** Keys mirror `ThemePreference`. */
      options: { system: 'Same as system', light: 'Light', dark: 'Dark' },
      /** Name of the header button, by the theme it switches to. */
      switchTo: { light: 'Switch to light theme', dark: 'Switch to dark theme' },
    },
    language: {
      label: 'Language',
      /** Name of the header button, by the language it switches to. */
      switchTo: (language: string): string => `Switch language to ${language}`,
      /** Each language in its own name, so anyone can find theirs; keys mirror `Locale`. */
      names: { es: 'Español', en: 'English' },
    },
  },
  /** Document title of a screen, e.g. "Session plan · NeuroMelody" (WCAG 2.4.2). */
  documentTitle: (page: string, appName: string): string => `${page} · ${appName}`,
};
