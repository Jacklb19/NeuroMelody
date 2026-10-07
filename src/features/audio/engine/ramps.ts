/**
 * Durations of the musical transitions between levels (ADR-12, RF-10):
 * every change is gradual, never instantaneous.
 */

/** Minimum length of any tempo ramp (RNF-03, HU-04). */
export const MIN_TEMPO_RAMP_S = 20;
/** Seconds per BPM of difference: "one beat per minute every two seconds". */
export const SECONDS_PER_BPM = 2;
/** Brightness and reverb are interpolated over 30 to 60 s; the middle of the range is used. */
export const TIMBRE_RAMP_DURATION_S = 45;
/** Length of the layer and mode fades (docs/diseno-musical.md, ADR-12). */
export const FADE_DURATION_S = 30;

/** Tempo ramp length: max(20 s, |ΔBPM| × 2 s). */
export function tempoRampDurationS(fromBpm: number, toBpm: number): number {
  return Math.max(MIN_TEMPO_RAMP_S, Math.abs(toBpm - fromBpm) * SECONDS_PER_BPM);
}
