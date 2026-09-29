import type { MotivoDescarte } from './types';
import {
  DESCARTES_PARA_REINICIAR,
  DESVIACION_MAXIMA,
  LATIDOS_REFERENCIA,
  RR_MAXIMO_MS,
  RR_MINIMO_MS,
} from './thresholds';

export interface Clasificacion {
  readonly aceptado: boolean;
  readonly motivoDescarte: MotivoDescarte | null;
}

const ACEPTADO: Clasificacion = { aceptado: true, motivoDescarte: null };

function mediana(valores: readonly number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  const centro = ordenados[mitad] ?? 0;
  return ordenados.length % 2 === 0 ? ((ordenados[mitad - 1] ?? 0) + centro) / 2 : centro;
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
export class FiltroLatidos {
  #referencia: number[] = [];
  #descartesSeguidos: number[] = [];

  clasificar(rrMs: number): Clasificacion {
    if (rrMs < RR_MINIMO_MS || rrMs > RR_MAXIMO_MS) {
      return { aceptado: false, motivoDescarte: 'fuera_de_rango' };
    }

    if (this.#referencia.length < LATIDOS_REFERENCIA) {
      this.#aceptar(rrMs);
      return ACEPTADO;
    }

    const referencia = mediana(this.#referencia);
    if (Math.abs(rrMs - referencia) / referencia > DESVIACION_MAXIMA) {
      this.#descartesSeguidos.push(rrMs);
      if (this.#descartesSeguidos.length >= DESCARTES_PARA_REINICIAR) {
        this.#referencia = this.#descartesSeguidos;
        this.#descartesSeguidos = [];
      }
      return { aceptado: false, motivoDescarte: 'desviacion' };
    }

    this.#aceptar(rrMs);
    return ACEPTADO;
  }

  /** Olvida la referencia; se usa al iniciar una nueva conexión. */
  reiniciar(): void {
    this.#referencia = [];
    this.#descartesSeguidos = [];
  }

  #aceptar(rrMs: number): void {
    this.#referencia = [...this.#referencia, rrMs].slice(-LATIDOS_REFERENCIA);
    this.#descartesSeguidos = [];
  }
}
