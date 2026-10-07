/**
 * Signal processing thresholds: provisional values approved in sprint 2 and
 * recorded in ADR-15 (docs/decisiones.md).
 */

/** Plausible range of an RR interval (30–200 bpm). */
export const MIN_RR_MS = 300;
export const MAX_RR_MS = 2000;

/** Maximum relative deviation from the reference median (20 % rule). */
export const MAX_DEVIATION = 0.2;
/** Accepted beats that make up the reference median. */
export const REFERENCE_BEATS = 5;
/** Consecutive deviation discards after which the reference is reset. */
export const DISCARDS_TO_RESET = 5;

/** Time without RR intervals beyond which there is a gap in the signal. */
export const MAX_GAP_MS = 3000;
/** Window and minimum proportion of accepted beats for the signal to count as good. */
export const QUALITY_WINDOW_MS = 30_000;
export const MIN_ACCEPTANCE = 0.8;

/** Analysis sliding window and recompute period (specification, control loop section). */
export const ANALYSIS_WINDOW_MS = 5 * 60 * 1000;
export const COMPUTE_PERIOD_MS = 5000;
/** Minimum valid NN signal in the window to publish indices. */
export const MIN_NN_FOR_INDICES_MS = 60_000;
