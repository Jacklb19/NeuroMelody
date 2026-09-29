import type { LatidoClasificado } from './types';

/** Índices de variabilidad en el dominio temporal (RF-05). */
export interface IndicesTemporales {
  /** Frecuencia cardíaca media (60000 / NN medio), en lpm; `null` sin NN. */
  readonly fcMedia: number | null;
  /** Raíz cuadrática media de las diferencias sucesivas, en ms; `null` sin pares. */
  readonly rmssd: number | null;
  /** Desviación estándar de los NN (con n − 1), en ms; `null` con menos de 2 NN. */
  readonly sdnn: number | null;
  /** Número de intervalos NN (aceptados) usados. */
  readonly nnValidos: number;
  /** Suma de los NN aceptados, en ms: cuánta señal válida respalda los índices. */
  readonly duracionNNms: number;
}

/**
 * Calcula FC media, RMSSD y SDNN sobre los latidos aceptados.
 *
 * El RMSSD solo usa pares de latidos adyacentes en la serie, ambos aceptados
 * y sin hueco entre ellos: una diferencia que atraviesa un descarte o una
 * pérdida de contacto no es una diferencia latido a latido.
 */
export function calcularIndicesTemporales(
  latidos: readonly LatidoClasificado[],
): IndicesTemporales {
  const nn: number[] = [];
  let sumaCuadradosDiferencias = 0;
  let pares = 0;
  let anterior: LatidoClasificado | null = null;

  for (const latido of latidos) {
    if (latido.aceptado) {
      nn.push(latido.rrMs);
      if (anterior?.aceptado === true && latido.contiguoAlAnterior) {
        sumaCuadradosDiferencias += (latido.rrMs - anterior.rrMs) ** 2;
        pares++;
      }
    }
    anterior = latido;
  }

  const duracionNNms = nn.reduce((suma, rr) => suma + rr, 0);
  const nnMedio = nn.length > 0 ? duracionNNms / nn.length : null;

  return {
    fcMedia: nnMedio === null ? null : 60000 / nnMedio,
    rmssd: pares > 0 ? Math.sqrt(sumaCuadradosDiferencias / pares) : null,
    sdnn: nnMedio === null || nn.length < 2 ? null : desviacionMuestral(nn, nnMedio),
    nnValidos: nn.length,
    duracionNNms,
  };
}

function desviacionMuestral(valores: readonly number[], media: number): number {
  const suma = valores.reduce((acumulado, v) => acumulado + (v - media) ** 2, 0);
  return Math.sqrt(suma / (valores.length - 1));
}
