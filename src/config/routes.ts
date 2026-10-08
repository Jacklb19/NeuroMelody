/**
 * Every path of the app (docs/pantallas.md). Screens and links use these
 * names instead of typing paths, so a route changes in one place.
 */
export const ROUTE_SEGMENTS = {
  app: 'app',
  warnings: 'warnings',
  plan: 'plan',
  session: 'session',
  summary: 'summary/:id',
  history: 'history',
  diagnostics: 'diagnostics',
} as const;

export const ROUTES = {
  /** Public landing page: what the app is and how it works. */
  home: '/',
  /** Start screen of the app itself. */
  app: `/${ROUTE_SEGMENTS.app}`,
  warnings: `/${ROUTE_SEGMENTS.warnings}`,
  plan: `/${ROUTE_SEGMENTS.plan}`,
  session: `/${ROUTE_SEGMENTS.session}`,
  history: `/${ROUTE_SEGMENTS.history}`,
  diagnostics: `/${ROUTE_SEGMENTS.diagnostics}`,
} as const;

/** Query parameters shared between screens. */
export const QUERY_PARAMS = {
  duration: 'duration',
  goals: 'goals',
} as const;

/** Summary of one saved session. */
export function summaryPath(id: string): string {
  return `/summary/${encodeURIComponent(id)}`;
}

/** Separator between goal ids in the URL; mirrors `GOALS_SEPARATOR` of the goal catalog. */
const GOALS_SEPARATOR = ',';

/** The session screen with the planned duration and, when chosen, its goals. */
export function sessionPath(durationMin: number, goals: readonly string[] = []): string {
  const params = new URLSearchParams({ [QUERY_PARAMS.duration]: String(durationMin) });
  if (goals.length > 0) params.set(QUERY_PARAMS.goals, goals.join(GOALS_SEPARATOR));
  return `${ROUTES.session}?${params.toString()}`;
}
