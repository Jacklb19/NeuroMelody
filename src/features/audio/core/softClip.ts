/** Techo absoluto de la salida: −1 dBFS. */
export const TECHO_DBFS = -1;
export const TECHO = 10 ** (TECHO_DBFS / 20);

/**
 * Recorte suave `techo · tanh(x / techo)`. A diferencia del compresor nativo,
 * garantiza que ninguna muestra supere el techo, y al ser continuo no
 * introduce chasquidos. Para señales pequeñas es casi la identidad.
 */
export function recortarSuave(muestra: number): number {
  return TECHO * Math.tanh(muestra / TECHO);
}

/**
 * Recorta un bloque en su sitio y devuelve el pico absoluto resultante.
 * No reserva memoria: apto para `process()`.
 */
export function recortarBloque(bloque: Float32Array): number {
  let pico = 0;
  for (let i = 0; i < bloque.length; i++) {
    const valor = recortarSuave(bloque[i] ?? 0);
    bloque[i] = valor;
    const absoluto = Math.abs(valor);
    if (absoluto > pico) {
      pico = absoluto;
    }
  }
  return pico;
}
