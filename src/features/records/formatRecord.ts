import type { Formatters } from '../../i18n/formatters';
import type { Messages } from '../../i18n/messages';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import type { Change } from './summarizeSession';

/** Decimals of the LF/HF ratio: two are enough to compare sessions. */
export const RATIO_DECIMALS = 2;

/** Durations under one whole minute read "less than 1 min" instead of "0 min". */
const SMALLEST_SHOWN_MINUTES = 1;

/** How stored sessions read on screen, in the interface language. */
export interface RecordFormatter {
  /** "7 de octubre de 2026, 10:00 a. m." in the device's time zone. */
  sessionDate(iso: string): string;
  /** Whole listening minutes, rounded down; under one minute reads "menos de 1 min". */
  listened(seconds: number): string;
  /** Signal minutes, rounded; a short but non-zero time reads "menos de 1 min". */
  signalTime(seconds: number): string;
  /** "78 → 68 lpm"; the empty-value mark when there is not enough data. */
  change(change: Change | null, unit: string): string;
  /** "4 → 7"; answers that were skipped show as the empty-value mark. */
  ratings(before: number | null, after: number | null): string;
  ratio(value: number | null): string;
}

/** Formatter of stored sessions for a dictionary and its locale formatters. */
export function createRecordFormatter(t: Messages, format: Formatters): RecordFormatter {
  const { common, records } = t;
  const minutes = (value: number): string => common.withUnit(String(value), common.units.minutes);
  const underSmallest = records.lessThan(minutes(SMALLEST_SHOWN_MINUTES));
  const rating = (value: number | null): string => (value === null ? common.noValue : String(value));

  return {
    sessionDate: (iso) => format.dateTime(iso),
    listened: (seconds) => {
      const whole = Math.floor(seconds / SECONDS_PER_MINUTE);
      return whole < SMALLEST_SHOWN_MINUTES ? underSmallest : minutes(whole);
    },
    signalTime: (seconds) => {
      const rounded = Math.round(seconds / SECONDS_PER_MINUTE);
      return rounded < SMALLEST_SHOWN_MINUTES && seconds > 0 ? underSmallest : minutes(rounded);
    },
    change: (change, unit) => {
      if (change === null) return common.noValue;
      const values = records.change(format.integer(Math.round(change.start)), format.integer(Math.round(change.end)));
      return common.withUnit(values, unit);
    },
    ratings: (before, after) => {
      if (before === null && after === null) return records.noAnswer;
      return records.change(rating(before), rating(after));
    },
    ratio: (value) => (value === null ? common.noValue : format.decimal(value, RATIO_DECIMALS)),
  };
}
