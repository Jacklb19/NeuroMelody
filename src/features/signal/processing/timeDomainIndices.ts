import type { ClassifiedBeat } from './types';
import { MS_PER_MINUTE } from '../../../shared/time';

/** Time-domain variability indices (RF-05). */
export interface TimeDomainIndices {
  /** Mean heart rate (one minute / mean NN), in bpm; `null` without NN. */
  readonly meanHr: number | null;
  /** Root mean square of successive differences, in ms; `null` without pairs. */
  readonly rmssd: number | null;
  /** Standard deviation of the NN (with n − 1), in ms; `null` with fewer than 2 NN. */
  readonly sdnn: number | null;
  /** Number of NN (accepted) intervals used. */
  readonly validNn: number;
  /** Sum of the accepted NN, in ms: how much valid signal backs the indices. */
  readonly nnDurationMs: number;
}

/**
 * Computes mean HR, RMSSD and SDNN over the accepted beats.
 *
 * RMSSD only uses pairs of beats adjacent in the series, both accepted and
 * with no gap between them: a difference spanning a discard or a contact loss
 * is not a beat-to-beat difference.
 */
export function computeTimeDomainIndices(
  beats: readonly ClassifiedBeat[],
): TimeDomainIndices {
  const nn: number[] = [];
  let sumSquaredDiffs = 0;
  let pairs = 0;
  let previous: ClassifiedBeat | null = null;

  for (const beat of beats) {
    if (beat.accepted) {
      nn.push(beat.rrMs);
      if (previous?.accepted === true && beat.contiguousWithPrevious) {
        sumSquaredDiffs += (beat.rrMs - previous.rrMs) ** 2;
        pairs++;
      }
    }
    previous = beat;
  }

  const nnDurationMs = nn.reduce((sum, rr) => sum + rr, 0);
  const meanNn = nn.length > 0 ? nnDurationMs / nn.length : null;

  return {
    meanHr: meanNn === null ? null : MS_PER_MINUTE / meanNn,
    rmssd: pairs > 0 ? Math.sqrt(sumSquaredDiffs / pairs) : null,
    sdnn: meanNn === null || nn.length < 2 ? null : sampleStdDev(nn, meanNn),
    validNn: nn.length,
    nnDurationMs,
  };
}

function sampleStdDev(values: readonly number[], mean: number): number {
  const sum = values.reduce((accumulated, v) => accumulated + (v - mean) ** 2, 0);
  return Math.sqrt(sum / (values.length - 1));
}
