import type { AdaptationSession } from '../features/adaptation/AdaptationSession';
import { CALIBRATION_MS, HYSTERESIS_ESTIMATES } from '../features/adaptation/rules';
import { COMPUTE_PERIOD_MS, MIN_NN_FOR_INDICES_MS } from '../features/signal/processing/thresholds';

/** The first publication of indices, once the window holds enough NN signal. */
const FIRST_READING_MS = MIN_NN_FOR_INDICES_MS;
/**
 * The reading that closes the calibration is the first estimate; the state is
 * accepted on the last of the consecutive estimates the hysteresis asks for.
 */
const LAST_READING_MS = CALIBRATION_MS + (HYSTERESIS_ESTIMATES - 1) * COMPUTE_PERIOD_MS;

/**
 * Feeds steady, good-quality indices from the first publication until the
 * state after calibration is accepted: the heart rate stays unchanged, so
 * the estimate is Uncertain and the music sits at the intermediate step.
 */
export function calibrateToUncertain(session: AdaptationSession): void {
  for (let ms = FIRST_READING_MS; ms <= LAST_READING_MS; ms += COMPUTE_PERIOD_MS) {
    session.receive({
      timeMs: ms, meanHr: 100, rmssd: 50, sdnn: 50, quality: 'good', nnDurationMs: ms,
      coverageMs: ms, acceptedBeats: 100, discardedBeats: 0, lfPower: null, hfPower: null, lfHfRatio: null,
    });
  }
}
