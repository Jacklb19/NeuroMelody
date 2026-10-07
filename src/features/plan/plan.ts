/** Allowed session durations, in minutes (RF-18: plans from 10 to 60 minutes). */
export const DURATIONS_MIN: readonly number[] = [10, 15, 20, 30, 45, 60];

/** Default plan: 20 minutes (also the offline plan from S6). */
export const DEFAULT_DURATION_MIN = 20;

/** Reads the duration from the URL and validates it at the boundary; falls back to the default if invalid. */
export function readDuration(value: string | null): number {
  const parsed = Number(value);
  return value !== null && DURATIONS_MIN.includes(parsed) ? parsed : DEFAULT_DURATION_MIN;
}
