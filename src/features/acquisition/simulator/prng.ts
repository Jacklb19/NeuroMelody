/** Generator of uniform numbers in [0, 1). */
export type RandomSource = () => number;

/**
 * mulberry32 pseudo-random generator with a 32-bit seed.
 *
 * Used instead of `Math.random` because the simulator scenarios must be
 * reproducible (RF-02): the same seed always yields the same series.
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
 * Sample of a standard normal N(0, 1) with the Box-Muller method.
 * It consumes exactly two values from the generator, which keeps the
 * sequence predictable.
 */
export function standardNormal(random: RandomSource): number {
  // 1 - u avoids log(0): u is in [0, 1), so 1 - u is in (0, 1].
  const u1 = 1 - random();
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
