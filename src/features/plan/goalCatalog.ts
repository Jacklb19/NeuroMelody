/**
 * Goals a person may pick for a session (HU-07, ADR-27). Optional and
 * multiple; the ids travel in the URL and are stored with the session (and
 * in `plans.goals` once sessions sync), and the dictionary words them.
 */
export const GOAL_IDS = ['relax', 'rest_before_sleep', 'calm_after_activity', 'slow_breathing', 'pause'] as const;

export type GoalId = (typeof GOAL_IDS)[number];

/** No goal is preselected: choosing one is up to the person. */
export const DEFAULT_GOALS: readonly GoalId[] = [];

/** Separator between goal ids in the session URL. */
export const GOALS_SEPARATOR = ',';

export function isGoalId(value: unknown): value is GoalId {
  return GOAL_IDS.some((id) => id === value);
}

/** Goals in catalog order, without repeats, so equal choices always look the same. */
export function normalizeGoals(goals: Iterable<GoalId>): GoalId[] {
  const chosen = new Set(goals);
  return GOAL_IDS.filter((id) => chosen.has(id));
}

/**
 * Reads the goals that the plan put in the session URL (`QUERY_PARAMS.goals`),
 * validated at the boundary: unknown ids are dropped instead of reaching the app.
 */
export function readGoals(value: string | null): GoalId[] {
  if (value === null) return [...DEFAULT_GOALS];
  return normalizeGoals(value.split(GOALS_SEPARATOR).map((entry) => entry.trim()).filter(isGoalId));
}
