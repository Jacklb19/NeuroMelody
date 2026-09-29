/** Generador de números uniformes en [0, 1). */
export type Aleatorio = () => number;

/**
 * Generador pseudoaleatorio mulberry32 con semilla de 32 bits.
 *
 * Se usa en lugar de `Math.random` porque los escenarios del simulador deben
 * ser reproducibles (RF-02): la misma semilla produce siempre la misma serie.
 */
export function crearAleatorio(semilla: number): Aleatorio {
  let estado = semilla | 0;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Muestra de una normal estándar N(0, 1) por el método de Box-Muller.
 * Consume exactamente dos valores del generador, lo que mantiene la
 * secuencia predecible.
 */
export function normalEstandar(aleatorio: Aleatorio): number {
  // 1 - u evita log(0): u pertenece a [0, 1), así que 1 - u pertenece a (0, 1].
  const u1 = 1 - aleatorio();
  const u2 = aleatorio();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
