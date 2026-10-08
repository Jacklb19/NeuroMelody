/**
 * Signal processing thresholds: provisional values approved in sprint 2 and
 * recorded in ADR-15 (docs/decisiones.md). This is the only home of the
 * signal parameters; other modules and their comments refer to these names.
 */
import { MS_PER_SECOND } from '../../../shared/time';

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
/** The recompute period in seconds, for code that counts publications over time. */
export const COMPUTE_PERIOD_S = COMPUTE_PERIOD_MS / MS_PER_SECOND;
/** Minimum valid NN signal in the window to publish indices. */
export const MIN_NN_FOR_INDICES_MS = 60_000;

/** Spectrum (RF-06, ADR-15): minimum continuous stretch for a stable LF estimate. */
export const MIN_SPECTRUM_MS = 120_000;
/**
 * Minimum proportion of accepted beats in that stretch. It starts equal to
 * {@link MIN_ACCEPTANCE} but is a separate rule, so tuning the signal quality
 * does not silently change when LF/HF is published.
 */
export const MIN_SPECTRUM_ACCEPTANCE = 0.8;
/** Uniform resampling rate of the NN series, in Hz (Task Force, 1996). */
export const RESAMPLE_HZ = 4;
/** Frequency bands in Hz, upper bound exclusive (Task Force, 1996). */
export const LF_BAND_HZ = [0.04, 0.15] as const;
export const HF_BAND_HZ = [0.15, 0.4] as const;
