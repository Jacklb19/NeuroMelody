import { ACTIVATION_STATE_IDS } from '../adaptation/activationStates';
import { COMPUTE_PERIOD_S } from '../signal/processing/thresholds';
import type { SessionRecord, SessionSample } from './sessionRecord';

/** Samples averaged at each end of the session, so one noisy reading does not decide the result. */
export const EDGE_SAMPLES = 3;

/** Seconds of signal those samples cover; the summary footnote states it. */
export const EDGE_SECONDS = EDGE_SAMPLES * COMPUTE_PERIOD_S;

/** A change compares two ends of the session, each with its own samples. */
const ENDS = 2;

/** What a sample can count towards: the calibration before any estimate, then each estimated state. */
export const SIGNAL_PHASE_IDS = ['calibrating', ...ACTIVATION_STATE_IDS] as const;

export type SignalPhase = (typeof SIGNAL_PHASE_IDS)[number];

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
  readonly secondsByState: Readonly<Record<SignalPhase, number>>;
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
 * Compares the start and the end of a metric. Each end averages up to
 * `EDGE_SAMPLES` good-quality samples. Both ends need their own samples:
 * with fewer than one per end there is no change.
 */
function changeOf(samples: readonly SessionSample[], key: MetricKey): Change | null {
  const values = valuesOf(samples, key);
  if (values.length < ENDS) return null;
  const edge = Math.min(EDGE_SAMPLES, Math.floor(values.length / ENDS));
  return { start: mean(values.slice(0, edge)), end: mean(values.slice(-edge)) };
}

/** Indicators shown in the session summary (RF-15) and the history (RF-16). */
export function summarizeSession(record: SessionRecord): SessionSummary {
  const secondsByState: Record<SignalPhase, number> = { calibrating: 0, high: 0, low: 0, uncertain: 0 };
  for (const sample of record.samples) {
    secondsByState[sample.estimatedState ?? 'calibrating'] += COMPUTE_PERIOD_S;
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
