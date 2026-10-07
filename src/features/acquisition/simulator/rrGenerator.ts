import { rrMsFromBpm } from '../heartRate';
import { quantizeRrMs } from '../rrUnits';
import { MS_PER_SECOND } from '../../../shared/time';
import type { Scenario } from '../../acquisition/simulator/scenarios';
import { createRandom, standardNormal } from './prng';

/** Frequency of the respiratory oscillation (HF band). */
export const RESPIRATORY_FREQUENCY_HZ = 0.25;
/** Frequency of the Mayer wave (LF band). */
export const MAYER_FREQUENCY_HZ = 0.1;
/**
 * Mixed into the seed of the artifact generator so it draws a different
 * sequence from the base series without consuming its numbers.
 */
export const ARTIFACT_SEED_SALT = 0x5bd1e995;

/** A generated beat: its RR interval and the instant it ends. */
export interface Beat {
  readonly rrMs: number;
  /** Signal time (ms since connection) at which the beat completes. */
  readonly endMs: number;
}

export interface RrGenerator {
  /** Generates the next beat of the series. */
  next(): Beat;
}

/**
 * Creates a deterministic beat generator for a scenario.
 *
 * Model: RR = 60000 / HR + A_resp·sin(2π·0.25·t) + A_Mayer·sin(2π·0.1·t + φ) + noise,
 * evaluated at the start of each beat and quantized to 1/1024 s. The two
 * oscillations give content in the HF and LF bands for spectral analysis.
 *
 * If the scenario has artifacts, some beats are replaced by a premature +
 * compensatory pair that keeps the sum of the two base beats. Artifacts use a
 * separate random generator, so the base series is identical to the clean
 * scenario with the same seed.
 *
 * The series depends only on the scenario and the seed.
 */
export function createRrGenerator(scenario: Scenario, seed: number): RrGenerator {
  const base = createBaseGenerator(scenario, seed);
  const artifacts = scenario.artifacts;
  if (artifacts === null) {
    return base;
  }

  // Derived seed so the base series numbers are not consumed.
  const artifactRandom = createRandom(seed ^ ARTIFACT_SEED_SALT);
  let pendingCompensatory: Beat | null = null;

  return {
    next(): Beat {
      if (pendingCompensatory !== null) {
        const compensatory = pendingCompensatory;
        pendingCompensatory = null;
        return compensatory;
      }
      const beat = base.next();
      if (artifactRandom() >= artifacts.prematureProbability) {
        return beat;
      }
      const nextBase = base.next();
      const prematureRr = quantizeRrMs(beat.rrMs * artifacts.prematureFraction);
      const startMs = beat.endMs - beat.rrMs;
      pendingCompensatory = {
        rrMs: beat.rrMs + nextBase.rrMs - prematureRr,
        endMs: nextBase.endMs,
      };
      return { rrMs: prematureRr, endMs: startMs + prematureRr };
    },
  };
}

function createBaseGenerator(scenario: Scenario, seed: number): RrGenerator {
  const random = createRandom(seed);
  const mayerPhase = 2 * Math.PI * random();
  let startMs = 0;

  return {
    next(): Beat {
      const p = scenario.paramsAt(startMs);
      const t = startMs / MS_PER_SECOND;
      const rawRr =
        rrMsFromBpm(p.meanHr) +
        p.respiratoryAmplitudeMs * Math.sin(2 * Math.PI * RESPIRATORY_FREQUENCY_HZ * t) +
        p.mayerAmplitudeMs * Math.sin(2 * Math.PI * MAYER_FREQUENCY_HZ * t + mayerPhase) +
        p.noiseMs * standardNormal(random);
      const rrMs = quantizeRrMs(rawRr);
      startMs += rrMs;
      return { rrMs, endMs: startMs };
    },
  };
}
