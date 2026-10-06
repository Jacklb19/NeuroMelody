/** Absolute output ceiling: −1 dBFS. */
export const CEILING_DBFS = -1;
export const CEILING = 10 ** (CEILING_DBFS / 20);

/**
 * Soft clip `ceiling · tanh(x / ceiling)`. Unlike the native compressor, it
 * guarantees no sample exceeds the ceiling, and being continuous it adds no
 * clicks. For small signals it is almost the identity.
 */
export function softClip(sample: number): number {
  return CEILING * Math.tanh(sample / CEILING);
}

/**
 * Clips a block in place and returns the resulting absolute peak.
 * It does not allocate: safe for `process()`.
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
