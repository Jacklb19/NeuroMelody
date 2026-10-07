import { ROUTES } from '../config/routes';
import type { Messages } from '../i18n/messages';

/** Entry of the main navigation: a route and the key of its label in `t.app.navigation`. */
export interface NavigationItem {
  readonly route: string;
  readonly labelKey: keyof Messages['app']['navigation'];
}

/**
 * Screens of the main navigation, in order (docs/pantallas.md). Diagnostics
 * is deliberately left out: it is a technical tool reached by its route.
 */
export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { route: ROUTES.home, labelKey: 'home' },
  { route: ROUTES.plan, labelKey: 'plan' },
  { route: ROUTES.session, labelKey: 'session' },
  { route: ROUTES.history, labelKey: 'history' },
];
