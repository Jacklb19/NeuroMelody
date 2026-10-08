import { CALIBRATION_MS } from '../adaptation/rules';
import { parseOption } from '../../shared/parseOption';
import { MS_PER_MINUTE } from '../../shared/time';

/** Allowed session durations, in minutes (RF-18 and ADR-16: plans from 10 to 60 minutes). */
export const DURATIONS_MIN = [10, 15, 20, 30, 45, 60] as const;

export type DurationMin = (typeof DURATIONS_MIN)[number];

/** Default plan: 20 minutes (also the offline plan from S6). */
export const DEFAULT_DURATION_MIN: DurationMin = 20;

/** Shortest and longest allowed plans; the home page shows them as the range. */
export const MIN_DURATION_MIN: number = Math.min(...DURATIONS_MIN);
export const MAX_DURATION_MIN: number = Math.max(...DURATIONS_MIN);

/**
 * Calibration length the plan announces, in minutes (ADR-12). Derived from
 * the adaptation rules so the copy cannot drift from what actually happens.
 */
export const CALIBRATION_MIN = CALIBRATION_MS / MS_PER_MINUTE;

/**
 * Reads the duration that the plan put in the session URL
 * (`QUERY_PARAMS.duration`) and validates it at the boundary against
 * `DURATIONS_MIN`; anything else falls back to the default. The value is
 * parsed as a number first so numerically equal spellings (`30.0`, ` 30`)
 * still select their plan.
 */
export function readDuration(value: string | null): DurationMin {
  return parseOption(DURATIONS_MIN, value === null ? null : Number(value), DEFAULT_DURATION_MIN);
}
