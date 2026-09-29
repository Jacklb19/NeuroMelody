import type { ClassifiedBeat } from './types';

/** Índices de variabilidad en el dominio temporal (RF-05). */
export interface TimeDomainIndices {
  /** Frecuencia cardíaca media (60000 / NN medio), en lpm; `null` sin NN. */
  readonly meanHr: number | null;
  /** Raíz cuadrática media de las diferencias sucesivas, en ms; `null` sin pares. */
  readonly rmssd: number | null;
  /** Desviación estándar de los NN (con n − 1), en ms; `null` con menos de 2 NN. */
  readonly sdnn: number | null;
  /** Número de intervalos NN (aceptados) usados. */
  readonly validNn: number;
  /** Suma de los NN aceptados, en ms: cuánta señal válida respalda los índices. */
  readonly nnDurationMs: number;
}

/**
 * Calcula FC media, RMSSD y SDNN sobre los latidos aceptados.
 *
 * El RMSSD solo usa pares de latidos adyacentes en la serie, ambos aceptados
 * y sin hueco entre ellos: una diferencia que atraviesa un descarte o una
 * pérdida de contacto no es una diferencia latido a latido.
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
    meanHr: meanNn === null ? null : 60000 / meanNn,
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
