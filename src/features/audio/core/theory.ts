/**
 * Fixed musical material of the session (docs/diseno-musical.md): tonal
 * center on D, a drone one octave below and the three level modes.
 */

/** D3 (≈ 146.8 Hz): tonal center fixed for the whole session. */
export const MIDI_TONIC = 50;
/** D2, one octave below the tonic. */
export const MIDI_DRONE = MIDI_TONIC - 12;

/** Modes, in the order the synthesizer `mode` parameter receives them. */
export const MODE = {
  majorPentatonic: 0,
  lydian: 1,
  dronePentatonic: 2,
} as const;

export type Mode = (typeof MODE)[keyof typeof MODE];

/**
 * Semitones above the tonic. D major pentatonic (D, E, F#, A, B) is
 * contained in D lydian, so fades between the two share notes.
 *
 */
export const SCALES: Readonly<Record<Mode, readonly number[]>> = {
  [MODE.majorPentatonic]: [0, 2, 4, 7, 9],
  [MODE.lydian]: [0, 2, 4, 6, 7, 9, 11],
  [MODE.dronePentatonic]: [0, 2, 4, 7, 9],
};

export function isMode(value: number): value is Mode {
  return value === MODE.majorPentatonic || value === MODE.lydian || value === MODE.dronePentatonic;
}

export function midiFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** MIDI note of scale degree `degree` (degrees above the octave are allowed). */
export function degreeNote(scale: readonly number[], degree: number, midiBase: number): number {
  const octave = Math.floor(degree / scale.length);
  const index = degree - octave * scale.length;
  return midiBase + 12 * octave + (scale[index] ?? 0);
}
