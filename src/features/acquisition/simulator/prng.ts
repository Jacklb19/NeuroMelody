/** Generador de números uniformes en [0, 1). */
export type RandomSource = () => number;

/**
 * Generador pseudoaleatorio mulberry32 con semilla de 32 bits.
 *
 * Se usa en lugar de `Math.random` porque los escenarios del simulador deben
 * ser reproducibles (RF-02): la misma semilla produce siempre la misma serie.
 */
export function createRandom(seed: number): RandomSource {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Muestra de una normal estándar N(0, 1) por el método de Box-Muller.
 * Consume exactamente dos valores del generador, lo que mantiene la
 * secuencia predecible.
 */
export function standardNormal(random: RandomSource): number {
  // 1 - u evita log(0): u pertenece a [0, 1), así que 1 - u pertenece a (0, 1].
  const u1 = 1 - random();
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
