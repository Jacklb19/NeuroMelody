/**
 * Shared types for signal processing (signal thread).
 * Technical terms (ectopic, anomalous) are only used in code; the UI always
 * speaks of "discarded due to signal quality".
 */

/**
 * Signal states shown to the person (always in descriptive language). The
 * list is the runtime source the thread protocol validates against.
 */
export const SIGNAL_QUALITIES = ['collecting', 'good', 'low'] as const;
export type SignalQuality = (typeof SIGNAL_QUALITIES)[number];

/** Reason an RR interval is excluded from the analysis. */
export type DiscardReason =
  /** Outside the plausible range `MIN_RR_MS`–`MAX_RR_MS` (thresholds.ts). */
  | 'out_of_range'
  /** Deviates more than `MAX_DEVIATION` from the reference median (ectopic beat or artifact). */
  | 'deviation'
  /** Arrived while the sensor had no skin contact. */
  | 'no_contact';

/** An RR interval already classified by the filter. */
export interface ClassifiedBeat {
  /** Signal time (ms since connection) at which the beat ends. */
  readonly endMs: number;
  readonly rrMs: number;
  readonly accepted: boolean;
  readonly discardReason: DiscardReason | null;
  /**
   * `false` if there was a gap or contact loss between this beat and the
   * previous one: the pair does not count as consecutive for RMSSD.
   */
  readonly contiguousWithPrevious: boolean;
}

/** Signal time interval flagged as low quality. */
export interface LowQualitySegment {
  readonly startMs: number;
  readonly endMs: number;
}
