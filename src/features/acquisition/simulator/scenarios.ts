/**
 * Simulator scenarios (RF-02, HU-02). The values were approved when sprint 1
 * was planned; the expected RMSSD is approximate and serves as a reference
 * for the tests. Their display names live in the dictionary, keyed by id.
 */

import { MS_PER_MINUTE } from '../../../shared/time';

/** Parameters of the RR series model at a given instant. */
export interface PhysiologicalParams {
  /** Mean heart rate, in beats per minute. */
  readonly meanHr: number;
  /** Amplitude of the respiratory oscillation (HF band, 0.25 Hz), in ms. */
  readonly respiratoryAmplitudeMs: number;
  /** Amplitude of the Mayer wave (LF band, 0.1 Hz), in ms. */
  readonly mayerAmplitudeMs: number;
  /** Standard deviation of the beat-to-beat Gaussian noise, in ms. */
  readonly noiseMs: number;
}

/** Scenarios in the order the selector offers them; the single source of truth for `ScenarioId`. */
export const SCENARIO_IDS = [
  'rest',
  'activation',
  'progressive_relaxation',
  'progressive_activation',
  'artifacts',
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

/** Scenario selected when the panel opens: a steady resting signal. */
export const DEFAULT_SCENARIO_ID: ScenarioId = 'rest';

/**
 * Simulated reading faults to test the filtering (RF-04): premature beats
 * followed by a compensatory one, and periodic contact losses.
 */
export interface ArtifactConfig {
  /** Probability that a beat is premature. */
  readonly prematureProbability: number;
  /** Duration of the premature beat as a fraction of the normal RR. */
  readonly prematureFraction: number;
  /** How often, in signal time, the sensor loses contact. */
  readonly contactLossPeriodMs: number;
  /** How long each contact loss lasts. */
  readonly contactLossDurationMs: number;
}

export interface Scenario {
  readonly id: ScenarioId;
  /** Parameters in effect at `timeMs` of signal time since connection. */
  paramsAt(timeMs: number): PhysiologicalParams;
  /** Simulated reading faults; `null` in clean scenarios. */
  readonly artifacts: ArtifactConfig | null;
}

/** Expected RMSSD ≈ 45 ms. */
export const REST_PARAMS: PhysiologicalParams = {
  meanHr: 62,
  respiratoryAmplitudeMs: 40,
  mayerAmplitudeMs: 25,
  noiseMs: 15,
};

/** Expected RMSSD ≈ 10 ms. */
export const ACTIVATION_PARAMS: PhysiologicalParams = {
  meanHr: 92,
  respiratoryAmplitudeMs: 8,
  mayerAmplitudeMs: 15,
  noiseMs: 5,
};

/** Values approved in sprint 2 (ADR-15 in docs/decisiones.md). */
export const DEFAULT_ARTIFACTS: ArtifactConfig = {
  prematureProbability: 0.02,
  prematureFraction: 0.7,
  contactLossPeriodMs: 90_000,
  contactLossDurationMs: 5000,
};

/** Transition length of the progressive scenarios, from one state to the other. */
export const PROGRESSIVE_TRANSITION_MS = 10 * MS_PER_MINUTE;

/** Share of the progressive transition completed at `timeMs`, clamped to [0, 1]. */
function transitionProgress(timeMs: number): number {
  return Math.min(Math.max(timeMs / PROGRESSIVE_TRANSITION_MS, 0), 1);
}

function interpolate(a: number, b: number, fraction: number): number {
  return a + (b - a) * fraction;
}

function interpolateParameters(
  from: PhysiologicalParams,
  to: PhysiologicalParams,
  fraction: number,
): PhysiologicalParams {
  return {
    meanHr: interpolate(from.meanHr, to.meanHr, fraction),
    respiratoryAmplitudeMs: interpolate(
      from.respiratoryAmplitudeMs,
      to.respiratoryAmplitudeMs,
      fraction,
    ),
    mayerAmplitudeMs: interpolate(from.mayerAmplitudeMs, to.mayerAmplitudeMs, fraction),
    noiseMs: interpolate(from.noiseMs, to.noiseMs, fraction),
  };
}

export const SCENARIOS: Readonly<Record<ScenarioId, Scenario>> = {
  rest: {
    id: 'rest',
    paramsAt: () => REST_PARAMS,
    artifacts: null,
  },
  activation: {
    id: 'activation',
    paramsAt: () => ACTIVATION_PARAMS,
    artifacts: null,
  },
  progressive_relaxation: {
    id: 'progressive_relaxation',
    // Moves linearly from activation to rest and then stays at rest.
    paramsAt: (timeMs) =>
      interpolateParameters(ACTIVATION_PARAMS, REST_PARAMS, transitionProgress(timeMs)),
    artifacts: null,
  },
  progressive_activation: {
    id: 'progressive_activation',
    paramsAt: (timeMs) =>
      interpolateParameters(REST_PARAMS, ACTIVATION_PARAMS, transitionProgress(timeMs)),
    artifacts: null,
  },
  artifacts: {
    id: 'artifacts',
    paramsAt: () => REST_PARAMS,
    artifacts: DEFAULT_ARTIFACTS,
  },
};
