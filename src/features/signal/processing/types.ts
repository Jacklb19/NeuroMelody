/**
 * Shared types for signal processing (signal thread).
 * Technical terms (ectopic, anomalous) are only used in code; the UI always
 * speaks of "discarded due to signal quality".
 */

/** Reason an RR interval is excluded from the analysis. */
export type DiscardReason =
  /** Outside the plausible range of 300–2000 ms. */
  | 'out_of_range'
  /** Deviates more than 20 % from the reference median (ectopic beat or artifact). */
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
