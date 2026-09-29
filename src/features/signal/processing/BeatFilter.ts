import type { DiscardReason } from './types';
import {
  DISCARDS_TO_RESET,
  MAX_DEVIATION,
  REFERENCE_BEATS,
  MAX_RR_MS,
  MIN_RR_MS,
} from './thresholds';

export interface Classification {
  readonly accepted: boolean;
  readonly discardReason: DiscardReason | null;
}

const ACCEPTED: Classification = { accepted: true, discardReason: null };

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const center = sorted[middle] ?? 0;
  return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + center) / 2 : center;
}

/**
 * Filtro de latidos (RF-04): separa los intervalos NN de los latidos
 * ectópicos y los artefactos.
 *
 * 1. Descarta los RR fuera del rango plausible, sin tocar el estado.
 * 2. Mientras no haya 5 latidos aceptados, acepta todo lo que esté en rango.
 * 3. Después, descarta los RR que se aparten más de un 20 % de la mediana de
 *    los últimos 5 aceptados.
 * 4. Si se descartan 5 latidos seguidos por desviación, la referencia pasa a
 *    ser esos 5 latidos: así un cambio real y sostenido de la frecuencia no
 *    se descarta para siempre.
 */
export class BeatFilter {
  #reference: number[] = [];
  #consecutiveDiscards: number[] = [];

  classify(rrMs: number): Classification {
    if (rrMs < MIN_RR_MS || rrMs > MAX_RR_MS) {
      return { accepted: false, discardReason: 'fuera_de_rango' };
    }

    if (this.#reference.length < REFERENCE_BEATS) {
      this.#accept(rrMs);
      return ACCEPTED;
    }

    const reference = median(this.#reference);
    if (Math.abs(rrMs - reference) / reference > MAX_DEVIATION) {
      this.#consecutiveDiscards.push(rrMs);
      if (this.#consecutiveDiscards.length >= DISCARDS_TO_RESET) {
        this.#reference = this.#consecutiveDiscards;
        this.#consecutiveDiscards = [];
      }
      return { accepted: false, discardReason: 'desviacion' };
    }

    this.#accept(rrMs);
    return ACCEPTED;
  }

  /** Olvida la referencia; se usa al iniciar una nueva conexión. */
  reset(): void {
    this.#reference = [];
    this.#consecutiveDiscards = [];
  }

  #accept(rrMs: number): void {
    this.#reference = [...this.#reference, rrMs].slice(-REFERENCE_BEATS);
    this.#consecutiveDiscards = [];
  }
}
