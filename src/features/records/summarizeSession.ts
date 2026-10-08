import type { ActivationState } from '../adaptation/AdaptationEngine';
import { COMPUTE_PERIOD_MS } from '../signal/processing/thresholds';
import type { SessionRecord, SessionSample } from './sessionRecord';

/** Samples averaged at each end of the session: 15 s of signal. */
export const EDGE_SAMPLES = 3;

const PERIOD_S = COMPUTE_PERIOD_MS / 1000;

/** A value at the start and at the end of the session; `null` without enough data. */
export interface Change {
  readonly start: number;
  readonly end: number;
}

export interface SessionSummary {
  readonly heartRate: Change | null;
  readonly rmssd: Change | null;
  /** Mean LF/HF ratio over the last samples that have one. */
  readonly lfHfAtEnd: number | null;
  /** Signal seconds spent in each estimated state; `calibrating` before any estimate. */
  readonly secondsByState: Readonly<Record<ActivationState | 'calibrating', number>>;
  readonly ratingChange: number | null;
}

type MetricKey = 'meanHr' | 'rmssd' | 'lfHfRatio';

function valuesOf(samples: readonly SessionSample[], key: MetricKey): number[] {
  return samples.flatMap((sample) => {
    const value = sample[key];
    return sample.goodQuality && value !== null ? [value] : [];
  });
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Compares the start and the end of a metric. Each end averages up to three
 * good-quality samples so a single noisy reading does not decide the result.
 * Both ends need their own samples: with fewer than two there is no change.
 */
function changeOf(samples: readonly SessionSample[], key: MetricKey): Change | null {
  const values = valuesOf(samples, key);
  if (values.length < 2) return null;
  const edge = Math.min(EDGE_SAMPLES, Math.floor(values.length / 2));
  return { start: mean(values.slice(0, edge)), end: mean(values.slice(-edge)) };
}

/** Indicators shown in the session summary (RF-15) and the history (RF-16). */
export function summarizeSession(record: SessionRecord): SessionSummary {
  const secondsByState = { calibrating: 0, high: 0, low: 0, uncertain: 0 };
  for (const sample of record.samples) {
    secondsByState[sample.estimatedState ?? 'calibrating'] += PERIOD_S;
  }
  const lfHf = valuesOf(record.samples, 'lfHfRatio').slice(-EDGE_SAMPLES);
  return {
    heartRate: changeOf(record.samples, 'meanHr'),
    rmssd: changeOf(record.samples, 'rmssd'),
    lfHfAtEnd: lfHf.length > 0 ? mean(lfHf) : null,
    secondsByState,
    ratingChange: record.ratingBefore !== null && record.ratingAfter !== null
      ? record.ratingAfter - record.ratingBefore
      : null,
  };
}
