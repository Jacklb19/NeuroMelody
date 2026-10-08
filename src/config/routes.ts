/**
 * Every path of the app (docs/pantallas.md). Screens and links use these
 * names instead of typing paths, so a route changes in one place.
 */
export const ROUTE_SEGMENTS = {
  warnings: 'warnings',
  plan: 'plan',
  session: 'session',
  summary: 'summary/:id',
  history: 'history',
  diagnostics: 'diagnostics',
} as const;

export const ROUTES = {
  home: '/',
  warnings: `/${ROUTE_SEGMENTS.warnings}`,
  plan: `/${ROUTE_SEGMENTS.plan}`,
  session: `/${ROUTE_SEGMENTS.session}`,
  history: `/${ROUTE_SEGMENTS.history}`,
  diagnostics: `/${ROUTE_SEGMENTS.diagnostics}`,
} as const;

/** Query parameters shared between screens. */
export const QUERY_PARAMS = {
  duration: 'duration',
} as const;

/** Summary of one saved session. */
export function summaryPath(id: string): string {
  return `/summary/${encodeURIComponent(id)}`;
}

/** The session screen with the planned duration. */
export function sessionPath(durationMin: number): string {
  return `${ROUTES.session}?${new URLSearchParams({ [QUERY_PARAMS.duration]: String(durationMin) }).toString()}`;
}
