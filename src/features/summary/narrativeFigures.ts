import { ACTIVATION_STATE_IDS, type ActivationState } from '../adaptation/activationStates';
import type { GoalId } from '../plan/goalCatalog';
import type { SessionRecord } from '../records/sessionRecord';
import { summarizeSession, type Change } from '../records/summarizeSession';
import { SECONDS_PER_MINUTE } from '../../shared/time';

/** A value at both ends of the session, in whole figures. */
interface WholeChange {
  readonly start: number;
  readonly end: number;
}

/**
 * The only data of a session that travels to the language model (ADR-08):
 * the aggregated figures the summary screen already shows, as whole numbers
 * and catalog values. No sample, no date and no identifier.
 */
export interface NarrativeFigures {
  readonly plannedMinutes: number;
  readonly listenedMinutes: number;
  readonly goals: readonly GoalId[];
  readonly pulse: WholeChange | null;
  /** Variation between beats (RMSSD), in milliseconds. */
  readonly variation: WholeChange | null;
  /** Whole minutes estimated in each state; `null` when the session never had an estimate. */
  readonly minutesByState: Readonly<Record<ActivationState, number>> | null;
  readonly ratingBefore: number | null;
  readonly ratingAfter: number | null;
}

const whole = (change: Change | null): WholeChange | null =>
  (change === null ? null : { start: Math.round(change.start), end: Math.round(change.end) });

/** The figures of a session, computed exactly as the summary screen computes what it shows. */
export function narrativeFigures(record: SessionRecord): NarrativeFigures {
  const summary = summarizeSession(record);
  const minutes = (state: ActivationState): number => Math.floor(summary.secondsByState[state] / SECONDS_PER_MINUTE);
  const estimated = ACTIVATION_STATE_IDS.some((state) => summary.secondsByState[state] > 0);
  return {
    plannedMinutes: record.plannedMinutes,
    listenedMinutes: Math.floor(record.listenedSeconds / SECONDS_PER_MINUTE),
    goals: record.goals,
    pulse: whole(summary.heartRate),
    variation: whole(summary.rmssd),
    minutesByState: estimated ? { high: minutes('high'), uncertain: minutes('uncertain'), low: minutes('low') } : null,
    ratingBefore: record.ratingBefore,
    ratingAfter: record.ratingAfter,
  };
}
