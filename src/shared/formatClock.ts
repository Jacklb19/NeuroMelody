import { SECONDS_PER_MINUTE } from './time';

/** Digits of each clock field, so "4:05" reads as "04:05". */
const CLOCK_FIELD_DIGITS = 2;

const pad = (value: number): string => String(value).padStart(CLOCK_FIELD_DIGITS, '0');

/** Formats whole seconds as `mm:ss` (minutes keep growing past 59). */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(seconds / SECONDS_PER_MINUTE))}:${pad(seconds % SECONDS_PER_MINUTE)}`;
}
