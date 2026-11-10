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
  progress: 'progress',
  report: 'report',
  collect: 'collect',
  diagnostics: 'diagnostics',
  account: 'account',
  privacy: 'privacy',
  login: 'login',
  register: 'register',
  forgotPassword: 'forgot-password',
  resetPassword: 'reset-password',
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
  /** Evolution across the sessions saved on the device. */
  progress: `/${ROUTE_SEGMENTS.progress}`,
  /** Printable summary of a range of sessions, to share with whoever accompanies the person. */
  report: `/${ROUTE_SEGMENTS.report}`,
  /** Guided recording that gives the classifier examples of the person. */
  collect: `/${ROUTE_SEGMENTS.collect}`,
  diagnostics: `/${ROUTE_SEGMENTS.diagnostics}`,
  /** Profile: summary and settings of the person, with or without an account. */
  account: `/${ROUTE_SEGMENTS.account}`,
  privacy: `/${ROUTE_SEGMENTS.privacy}`,
  login: `/${ROUTE_SEGMENTS.login}`,
  register: `/${ROUTE_SEGMENTS.register}`,
  forgotPassword: `/${ROUTE_SEGMENTS.forgotPassword}`,
  /** Opened from the recovery email to choose a new password. */
  resetPassword: `/${ROUTE_SEGMENTS.resetPassword}`,
} as const;

/** Query parameters shared between screens. */
export const QUERY_PARAMS = {
  duration: 'duration',
  goals: 'goals',
  /** Ambience under the music: an id of the ambience catalog. */
  ambience: 'ambience',
  /** Instrument of the music: an id of the instrument catalog. */
  instrument: 'instrument',
  soundMode: 'sound-mode',
  soundProfile: 'sound-profile',
  guide: 'guide',
  /** Which sessions the report covers: an id of the progress range catalog. */
  range: 'range',
} as const;

/** Absolute URL of a route, for the links the identity provider sends or returns to. */
export function absoluteUrl(origin: string, route: string): string {
  return new URL(route, origin).toString();
}

/** Summary of one saved session. */
export function summaryPath(id: string): string {
  return `/summary/${encodeURIComponent(id)}`;
}

/** The report of a range of sessions (an id of the progress range catalog). */
export function reportPath(range: string): string {
  return `${ROUTES.report}?${new URLSearchParams({ [QUERY_PARAMS.range]: range }).toString()}`;
}

/** Separator between goal ids in the URL; mirrors `GOALS_SEPARATOR` of the goal catalog. */
const GOALS_SEPARATOR = ',';

function planParams(goals: readonly string[]): URLSearchParams {
  const params = new URLSearchParams();
  if (goals.length > 0) params.set(QUERY_PARAMS.goals, goals.join(GOALS_SEPARATOR));
  return params;
}

/** The plan screen with some goals, and optionally its duration, already chosen. */
export function planPath(goals: readonly string[] = [], durationMin?: number): string {
  const params = planParams(goals);
  if (durationMin !== undefined) params.set(QUERY_PARAMS.duration, String(durationMin));
  const query = params.toString();
  return query === '' ? ROUTES.plan : `${ROUTES.plan}?${query}`;
}

/** The session screen with the planned duration and, when chosen, its goals, its ambience and its instrument. */
export function sessionPath(
  durationMin: number,
  goals: readonly string[] = [],
  ambience?: string,
  instrument?: string,
  sound?: { readonly fixed: boolean; readonly profile: string; readonly guide: boolean },
): string {
  const params = planParams(goals);
  params.set(QUERY_PARAMS.duration, String(durationMin));
  if (ambience !== undefined) params.set(QUERY_PARAMS.ambience, ambience);
  if (instrument !== undefined) params.set(QUERY_PARAMS.instrument, instrument);
  if (sound?.fixed) params.set(QUERY_PARAMS.soundMode, 'fixed');
  if (sound !== undefined && sound.profile !== 'original') params.set(QUERY_PARAMS.soundProfile, sound.profile);
  if (sound?.guide) params.set(QUERY_PARAMS.guide, '1');
  return `${ROUTES.session}?${params.toString()}`;
}
