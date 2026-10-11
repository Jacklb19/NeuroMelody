import { common } from './common';

/** English copy of the records area: stored sessions, self-ratings and the CSV export (ADR-25). */
export const records = {
  /** Label of the self-ratings, shared by the summary and the history. */
  ratingLabel: 'How you felt',
  rating: {
    /** Meaning of both ends of the self-rating scale (ADR-23). */
    scaleHint: (min: number, max: number): string => `${String(min)} = not well at all · ${String(max)} = very well`,
    clear: 'Clear answer',
  },
  /** Both self-ratings were skipped. */
  noAnswer: 'Not answered',
  /** Label of the session goals, shared by the summary and the history. */
  goalsLabel: 'Goals',
  noGoals: 'No goals chosen',
  /** Goal names joined for one line, e.g. "Relax, Take a break for myself". */
  goalList: (names: readonly string[]): string => names.join(', '),
  /** A value at the start and at the end of the session, e.g. "78 → 68". */
  change: (start: string, end: string): string => `${start} → ${end}`,
  /** A duration shorter than the given amount, e.g. "less than 1 min". */
  lessThan: (amount: string): string => `less than ${amount}`,
  readFailed: (reason: string): string => `The history could not be read (${reason}).`,
  /** Keyed by `SessionStoreErrorCode`. */
  errors: {
    invalid_record: 'The session does not have a valid format.',
    invalid_rating: (min: number, max: number): string =>
      `The rating must be a whole number from ${String(min)} to ${String(max)}.`,
    not_found: 'The session was not found.',
    access_failed: "The device's history could not be accessed.",
    open_failed: "The device's history could not be opened.",
  },
  /**
   * Downloadable CSV (RF-15). It is meant for the person and their
   * therapist, so its column names and comments follow the interface language.
   */
  csv: {
    /** First comment line. */
    title: (appName: string, id: string): string => `${appName} · session ${id}`,
    /** Names of the session details written as comment lines. */
    fields: {
      startedAt: 'start',
      endedAt: 'end',
      plannedMinutes: 'plan_minutes',
      listenedSeconds: 'listened_seconds',
      ratingBefore: 'rating_before',
      ratingAfter: 'rating_after',
    },
    disclaimer: common.nonClinicalIndicators,
    /** Keyed by `CsvColumn`. */
    columns: {
      second: 'second',
      meanHr: 'mean_hr_bpm',
      rmssd: 'rmssd_ms',
      sdnn: 'sdnn_ms',
      lfHfRatio: 'lf_hf',
      estimatedState: 'estimated_state',
      goodQuality: 'good_quality',
    },
    /** File name without extension, e.g. "neuromelody-session-2026-10-07T10-00-00". */
    fileName: (prefix: string, startedAt: string): string => `${prefix}-session-${startedAt}`,
  },
};
