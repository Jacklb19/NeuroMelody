import { ROUTES } from '../../config/routes';

/**
 * Places of the app worth discovering from the start screen, in order. Each
 * one exists elsewhere; this list only brings them into sight. The dictionary
 * words them (`home.explore.items`).
 */
export const EXPLORE_IDS = ['worlds', 'progress', 'report', 'reminder', 'collect', 'diagnostics'] as const;

export type ExploreId = (typeof EXPLORE_IDS)[number];

export const EXPLORE_ROUTES: Readonly<Record<ExploreId, string>> = {
  worlds: ROUTES.plan,
  progress: ROUTES.progress,
  report: ROUTES.report,
  reminder: ROUTES.account,
  collect: ROUTES.collect,
  diagnostics: ROUTES.diagnostics,
};
