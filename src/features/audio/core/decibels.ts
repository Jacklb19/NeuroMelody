/**
 * Decibel conversions shared by the main thread and the audio thread. Pure
 * and allocation-free, so they are safe inside `process()`.
 */

/** Amplitude ratio of a level in dB. */
export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

/** Level in dB of an amplitude ratio. */
export function gainToDb(gain: number): number {
  return 20 * Math.log10(gain);
}
