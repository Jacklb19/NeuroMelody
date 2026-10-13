/**
 * Sine oscillator read from a table. Every voice reads it several times per
 * sample, so a table with linear interpolation replaces `Math.sin` on the
 * audio thread. Pure and allocation-free: safe inside `process()`.
 */

/** Entries in one cycle; a power of two keeps the interpolation error below −90 dB. */
const TABLE_SIZE = 4096;

/** One extra entry repeats the first, so interpolation never reads past the end. */
const TABLE = Float32Array.from({ length: TABLE_SIZE + 1 }, (_, i) => Math.sin((2 * Math.PI * i) / TABLE_SIZE));

/** Sine of a phase measured in cycles: `sine(0.25)` is 1. Any real phase is accepted. */
export function sine(phase: number): number {
  const position = (phase - Math.floor(phase)) * TABLE_SIZE;
  const index = Math.floor(position);
  const low = TABLE[index] ?? 0;
  return low + (position - index) * ((TABLE[index + 1] ?? 0) - low);
}
