/**
 * Rules of the provisional activation estimator and of the guidance (ADR-12).
 * Uncalibrated values with no physiological validation; they are tuned here
 * and nowhere else.
 */

/** Signal time, counted from the start of the signal, in which the baseline is sought. */
export const CALIBRATION_MS = 180_000;
/** Valid, good-quality index publications the baseline averages, at least. */
export const MIN_BASELINE_READINGS = 12;

/**
 * Relative change of mean heart rate against the baseline: High needs a rise
 * of at least this much and Low a fall of at least this much (±10 %).
 */
export const HEART_RATE_CHANGE = 0.1;
/**
 * Relative change of RMSSD against the baseline, opposite to the heart rate:
 * High needs a fall of at least this much and Low a rise (∓20 %).
 */
export const RMSSD_CHANGE = 0.2;

/** Consecutive equal estimates before a new state is accepted, Uncertain included. */
export const HYSTERESIS_ESTIMATES = 3;
/** Latest estimates that must all be free of High before advancing a step. */
export const NO_HIGH_WINDOW_ESTIMATES = HYSTERESIS_ESTIMATES;

/** Audio time a level is kept, since the last transition, before advancing again. */
export const MIN_LEVEL_DURATION_S = 180;
