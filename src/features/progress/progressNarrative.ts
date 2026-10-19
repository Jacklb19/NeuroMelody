import { readGoals, type GoalId } from '../plan/goalCatalog';
import type { InsightComparison, InsightDimension, InsightMetric } from './historyInsights';

export const PROGRESS_FRAMINGS = ['overview', 'balance'] as const;
export type ProgressFraming = (typeof PROGRESS_FRAMINGS)[number];
export const PROGRESS_OBSERVATION_IDS = ['o1', 'o2', 'o3'] as const;
export type ProgressObservationId = (typeof PROGRESS_OBSERVATION_IDS)[number];

export interface ProgressObservation {
  readonly id: ProgressObservationId;
  readonly dimension: InsightDimension;
  readonly metric: InsightMetric;
  readonly goals: readonly GoalId[];
  readonly program_version: number;
  readonly source: string | null;
  readonly groups: readonly { readonly option: string; readonly count: number; readonly median: number }[];
}

export interface ProgressNarrative {
  readonly framing: ProgressFraming;
  readonly observationIds: readonly ProgressObservationId[];
}

/** Explicit projection: no record, date, note or signal can be serialized by this boundary. */
export function progressObservations(comparisons: readonly InsightComparison[]): ProgressObservation[] {
  return comparisons.flatMap((comparison, index) => {
    const id = PROGRESS_OBSERVATION_IDS[index];
    if (id === undefined || comparison.pair === null) return [];
    return [{ id, dimension: comparison.dimension, metric: comparison.metric, goals: readGoals(comparison.goal),
      program_version: comparison.version, source: comparison.source,
      groups: comparison.pair.map((group) => ({ option: group.value, count: group.count, median: group.median })),
    }];
  });
}

/** Rejects arbitrary prose, missing, extra or reordered references, even from a successful HTTP response. */
export function progressNarrativeFromWire(value: unknown, observations: readonly ProgressObservation[]): ProgressNarrative | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;
  const framing = PROGRESS_FRAMINGS.find((id) => id === body.framing);
  const ids = observations.map((observation) => observation.id);
  if (body.generated !== true || framing === undefined || typeof body.model !== 'string' || body.model.trim() === ''
    || !Array.isArray(body.observation_ids) || body.observation_ids.length !== ids.length
    || !body.observation_ids.every((id: unknown, index: number) => id === ids[index])
    || Object.keys(body).some((key) => !['generated', 'model', 'framing', 'observation_ids'].includes(key))) return null;
  return { framing, observationIds: ids };
}
