/**
 * How many sessions the progress view shows (ADR-33), counted from the most
 * recent. The dictionary words each option.
 */
export const PROGRESS_RANGE_IDS = ['last7', 'last30', 'all'] as const;

export type ProgressRangeId = (typeof PROGRESS_RANGE_IDS)[number];

export const DEFAULT_PROGRESS_RANGE: ProgressRangeId = 'last30';

/** Sessions kept by each option; `null` keeps them all. */
export const PROGRESS_RANGE_SIZES: Readonly<Record<ProgressRangeId, number | null>> = {
  last7: 7,
  last30: 30,
  all: null,
};
