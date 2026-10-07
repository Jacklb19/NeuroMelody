import type { AdaptationSession } from '../features/adaptation/AdaptationSession';

/**
 * Feeds steady, good-quality indices from 60 s to 190 s of signal: enough
 * to finish calibration with an unchanged heart rate, so the estimate is
 * Uncertain and the music sits at the intermediate step.
 */
export function calibrateToUncertain(session: AdaptationSession): void {
  for (let ms = 60_000; ms <= 190_000; ms += 5000) {
    session.receive({
      timeMs: ms, meanHr: 100, rmssd: 50, sdnn: 50, quality: 'good', nnDurationMs: ms,
      coverageMs: ms, acceptedBeats: 100, discardedBeats: 0, lfPower: null, hfPower: null, lfHfRatio: null,
    });
  }
}
