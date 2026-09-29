import { quantizeRrMs } from '../rrUnits';
import type { Scenario } from '../../acquisition/simulator/scenarios';
import { createRandom, standardNormal } from './prng';

/** Frecuencia de la oscilación respiratoria (banda HF). */
export const RESPIRATORY_FREQUENCY_HZ = 0.25;
/** Frecuencia de la onda de Mayer (banda LF). */
export const MAYER_FREQUENCY_HZ = 0.1;

/** Un latido generado: su intervalo RR y el instante en que termina. */
export interface Beat {
  readonly rrMs: number;
  /** Tiempo de señal (ms desde la conexión) en que se completa el latido. */
  readonly endMs: number;
}

export interface RrGenerator {
  /** Genera el siguiente latido de la serie. */
  next(): Beat;
}

/**
 * Crea un generador determinista de latidos para un escenario.
 *
 * Modelo: RR = 60000 / FC + A_resp·sen(2π·0,25·t) + A_Mayer·sen(2π·0,1·t + φ) + ruido,
 * evaluado al inicio de cada latido y cuantizado a 1/1024 s. Las dos
 * oscilaciones dan contenido en las bandas HF y LF para el análisis espectral.
 *
 * Si el escenario tiene artefactos, algunos latidos se sustituyen por un par
 * prematuro + compensatorio que conserva la suma de los dos latidos base.
 * Los artefactos usan un generador aleatorio aparte, así que la serie base es
 * idéntica a la del escenario limpio con la misma semilla.
 *
 * La serie depende solo del escenario y de la semilla.
 */
export function createRrGenerator(scenario: Scenario, seed: number): RrGenerator {
  const base = createBaseGenerator(scenario, seed);
  const artifacts = scenario.artifacts;
  if (artifacts === null) {
    return base;
  }

  // Semilla derivada para no consumir números de la serie base.
  const artifactRandom = createRandom(seed ^ 0x5bd1e995);
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
      const t = startMs / 1000;
      const rawRr =
        60000 / p.meanHr +
        p.respiratoryAmplitudeMs * Math.sin(2 * Math.PI * RESPIRATORY_FREQUENCY_HZ * t) +
        p.mayerAmplitudeMs * Math.sin(2 * Math.PI * MAYER_FREQUENCY_HZ * t + mayerPhase) +
        p.noiseMs * standardNormal(random);
      const rrMs = quantizeRrMs(rawRr);
      startMs += rrMs;
      return { rrMs, endMs: startMs };
    },
  };
}
