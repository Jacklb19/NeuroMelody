/** Techo absoluto de la salida: −1 dBFS. */
export const CEILING_DBFS = -1;
export const CEILING = 10 ** (CEILING_DBFS / 20);

/**
 * Recorte suave `techo · tanh(x / techo)`. A diferencia del compresor nativo,
 * garantiza que ninguna muestra supere el techo, y al ser continuo no
 * introduce chasquidos. Para señales pequeñas es casi la identidad.
 */
export function softClip(sample: number): number {
  return CEILING * Math.tanh(sample / CEILING);
}

/**
 * Recorta un bloque en su sitio y devuelve el pico absoluto resultante.
 * No reserva memoria: apto para `process()`.
 */
export function softClipBlock(block: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < block.length; i++) {
    const value = softClip(block[i] ?? 0);
    block[i] = value;
    const absolute = Math.abs(value);
    if (absolute > peak) {
      peak = absolute;
    }
  }
  return peak;
}
