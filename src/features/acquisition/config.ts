/**
 * Tunable values of the acquisition layer (ADR-25): boundary limits, timing
 * and how sources report the heart rate. The camera prototype keeps its own
 * tuning in camera/config.ts and the example recordings their format in
 * recording/recordingCatalog.ts.
 */

/**
 * Heart rate limits accepted at the layer boundary, in bpm. They are wider
 * than the plausible RR range of the beat filter (MIN_RR_MS–MAX_RR_MS in
 * signal/processing/thresholds.ts, about 30–200 bpm, ADR-15) on purpose: the
 * boundary only rejects impossible data, the filter judges plausibility.
 */
export const MIN_HR = 20;
export const MAX_HR = 250;

/** Notification period in signal time, like a BLE strap. */
export const NOTIFICATION_PERIOD_MS = 1000;
/** Real period at which pending notifications are checked. */
export const CHECK_PERIOD_MS = 100;

/** Recent beats averaged by the simulator and the recordings to report the heart rate. */
export const BEATS_FOR_HR = 4;

/**
 * Waits before automatic reconnection attempts of the strap, in ms (ADR-17):
 * quick tries first, then every 8 s until about one minute, because a strap
 * can lose contact for a while when it is adjusted.
 */
export const RECONNECT_DELAYS_MS: readonly number[] = [1000, 2000, 4000, 8000, ...Array<number>(6).fill(8000)];

/** Longest a single GATT connection attempt may take before it is abandoned. */
export const ATTEMPT_TIMEOUT_MS = 10_000;

/** Fixed seed: the same simulated session repeats on reconnect (RF-02). */
export const SIMULATOR_SEED = 1;
