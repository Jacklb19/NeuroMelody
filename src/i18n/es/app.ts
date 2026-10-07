/** Spanish copy of the app shell: skip link, main navigation and document titles (ADR-25). */
export const app = {
  skipToContent: 'Saltar al contenido',
  /** Accessible name of the main navigation landmark. */
  mainNavigation: 'Principal',
  /** Labels of the main navigation; keys mirror `NAVIGATION_ITEMS`. */
  navigation: {
    home: 'Inicio',
    plan: 'Plan',
    session: 'Sesión',
    history: 'Historial',
  },
  /** Document title of a screen, e.g. "Plan de sesión · NeuroMelody" (WCAG 2.4.2). */
  documentTitle: (page: string, appName: string): string => `${page} · ${appName}`,
};
