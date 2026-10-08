/**
 * Scaling of the tachogram, in CSS pixels and milliseconds. Colours, font and
 * lengths (margins, offsets, stroke widths) are design values and come from
 * the palette (CSS variables); these data-scaling choices live here so the
 * Worker code holds no unnamed number.
 */
import { MS_PER_MINUTE } from '../../../shared/time';

/** Smallest plot side, so the scales never divide by zero on a collapsed canvas. */
export const MIN_PLOT_SIZE_PX = 1;

/** RR axis range while there are no accepted beats yet. */
export const DEFAULT_RR_RANGE_MS = { min: 600, max: 1200 } as const;
/**
 * RR axis auto-scaling: the data range gets a margin and is rounded, so the
 * scale does not jump on every beat; a range narrower than the minimum span
 * is widened on both sides.
 */
export const RR_AXIS_PADDING_MS = 50;
export const RR_AXIS_ROUNDING_MS = 100;
export const RR_AXIS_MIN_SPAN_MS = 200;
export const RR_AXIS_EXPANSION_MS = 100;
/** Above this span the RR ticks switch from the narrow to the wide step. */
export const RR_AXIS_WIDE_SPAN_MS = 600;
export const RR_TICK_STEP_MS = { narrow: 100, wide: 200 } as const;

/** Time axis ticks fall on whole signal minutes. */
export const TIME_TICK_INTERVAL_MS = MS_PER_MINUTE;
