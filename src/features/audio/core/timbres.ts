/**
 * How each instrument of the synthesizer sounds (docs/diseno-musical.md).
 *
 * A note is two oscillators tuned slightly apart and placed left and right,
 * which gives it width and a slow shimmer. Both are bent by a third one
 * (frequency modulation), which adds overtones: the louder the note, the more
 * overtones, so a note is brighter when struck and mellower as it fades, like
 * an acoustic instrument. The brightness filter of each level then has
 * overtones to soften.
 */

export interface Timbre {
  /** Peak amplitude of each of the two oscillators. */
  readonly amplitude: number;
  /** Time to reach the peak, in seconds. */
  readonly attackS: number;
  /** Time constant of the fade after the peak, in seconds. */
  readonly decayS: number;
  /** Distance of each oscillator from the pitch of the note, in Hz: they beat at twice this rate. */
  readonly detuneHz: number;
  /** Stereo distance between the two oscillators, from 0 (both centred) to 1 (one on each side). */
  readonly width: number;
  /** Amount of overtones at the peak (modulation index, in radians). */
  readonly brightness: number;
  /** Amount of overtones left when the note has faded (modulation index, in radians). */
  readonly body: number;
}

/** Chords of the harmony layer: a soft pad that swells and fades. */
export const CHORD_TIMBRE: Timbre = {
  amplitude: 0.08,
  attackS: 0.8,
  decayS: 2.5,
  detuneHz: 0.35,
  width: 0.6,
  brightness: 1.3,
  body: 0.45,
};

/** Open dyads over the drone at the target level: slower and darker than a chord. */
export const DYAD_TIMBRE: Timbre = {
  amplitude: 0.09,
  attackS: 2,
  decayS: 4,
  detuneHz: 0.25,
  width: 0.7,
  brightness: 0.9,
  body: 0.35,
};

/** Melody notes: a soft struck tone, close to an electric piano. */
export const MELODY_TIMBRE: Timbre = {
  amplitude: 0.1,
  attackS: 0.012,
  decayS: 1.4,
  detuneHz: 0.5,
  width: 0.3,
  brightness: 2.2,
  body: 0.3,
};

/**
 * Notes above this pitch get proportionally fewer overtones, so the high
 * register stays soft instead of turning harsh (D4, one octave above the tonic).
 */
export const BRIGHTNESS_REFERENCE_HZ = 293.66;

export interface DronePartial {
  /** Semitones above the drone note (D2). */
  readonly semitones: number;
  readonly gain: number;
  /** Difference between its left and right oscillators, in Hz: a slow drift between the ears. */
  readonly beatHz: number;
  /** Stereo distance between its two oscillators (0 to 1); low partials stay near the centre. */
  readonly width: number;
  /** Rate and depth of its own slow swell. The rates share no common period, so the blend never repeats. */
  readonly swellHz: number;
  readonly swellDepth: number;
}

/**
 * The drone is a stack of octaves and fifths over D2 instead of two fixed
 * sines: each partial swells on its own, and the upper ones (D3 and above)
 * keep the drone audible on small speakers that cannot reproduce D2.
 */
export const DRONE_PARTIALS: readonly DronePartial[] = [
  { semitones: 0, gain: 0.5, beatHz: 0.11, width: 0.25, swellHz: 0.031, swellDepth: 0.1 },
  { semitones: 7, gain: 0.42, beatHz: 0.17, width: 0.35, swellHz: 0.047, swellDepth: 0.25 },
  { semitones: 12, gain: 0.5, beatHz: 0.23, width: 0.5, swellHz: 0.059, swellDepth: 0.35 },
  { semitones: 19, gain: 0.3, beatHz: 0.31, width: 0.7, swellHz: 0.071, swellDepth: 0.5 },
  { semitones: 24, gain: 0.16, beatHz: 0.41, width: 0.8, swellHz: 0.083, swellDepth: 0.6 },
];

/** Level of the drone partial with gain 1. */
export const DRONE_AMPLITUDE = 0.1;
