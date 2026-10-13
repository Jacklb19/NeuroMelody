/** Spanish copy of the app shell: skip link, main navigation and document titles (ADR-25). */
export const app = {
  skipToContent: 'Saltar al contenido',
  /** Description of index.html, read by search engines and link previews. */
  shellDescription: (appName: string): string =>
    `${appName}: música generativa adaptada en tiempo real a señales fisiológicas. Herramienta de bienestar, no es un dispositivo médico.`,
  /** Accessible name of the main navigation landmark. */
  mainNavigation: 'Principal',
  /** Labels of the main navigation; keys mirror `NAVIGATION_ITEMS`. */
  navigation: {
    home: 'Inicio',
    plan: 'Nueva sesión',
    history: 'Historial',
  },
  /** Accessible name of the avatar that opens the profile. */
  profile: 'Perfil',
  /** Appearance and language controls, in the header and the profile. */
  settings: {
    theme: {
      label: 'Tema',
      /** Keys mirror `ThemePreference`. */
      options: { system: 'Sistema', light: 'Claro', dark: 'Oscuro' },
      /** Name of the header button, by the theme it switches to. */
      switchTo: { light: 'Cambiar a tema claro', dark: 'Cambiar a tema oscuro' },
    },
    language: {
      label: 'Idioma',
      /** Name of the header button, by the language it switches to. */
      switchTo: (language: string): string => `Cambiar idioma a ${language}`,
      /** Each language in its own name, so anyone can find theirs; keys mirror `Locale`. */
      names: { es: 'Español', en: 'English' },
    },
  },
  /** Document title of a screen, e.g. "Plan de sesión · NeuroMelody" (WCAG 2.4.2). */
  documentTitle: (page: string, appName: string): string => `${page} · ${appName}`,
};
