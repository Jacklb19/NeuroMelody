/**
 * Fixed musical material of the session (docs/diseno-musical.md): tonal
 * center on D, a drone one octave below and the three level modes.
 */

/** Semitones in an octave (twelve-tone equal temperament). */
export const SEMITONES_PER_OCTAVE = 12;
/** Tuning reference: A4 is MIDI note 69 at 440 Hz (concert pitch). */
export const A4_MIDI = 69;
export const A4_FREQUENCY_HZ = 440;

/** D3 (≈ 146.8 Hz): tonal center fixed for the whole session. */
export const MIDI_TONIC = 50;
/** D2, one octave below the tonic. */
export const MIDI_DRONE = MIDI_TONIC - SEMITONES_PER_OCTAVE;

/** Modes, in the order the synthesizer `mode` parameter receives them. */
export const MODE = {
  majorPentatonic: 0,
  lydian: 1,
  dronePentatonic: 2,
} as const;

export type Mode = (typeof MODE)[keyof typeof MODE];

/** Name of a mode in `MODE`: the key its interface label uses. */
export type ModeName = keyof typeof MODE;

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

/**
 * Name of a mode value. Labels are looked up by name, so reordering or adding
 * modes can never show the label of another mode.
 */
export function modeName(mode: Mode): ModeName {
  for (const name of Object.keys(MODE) as ModeName[]) {
    if (MODE[name] === mode) {
      return name;
    }
  }
  throw new RangeError(`Unknown mode: ${String(mode)}`);
}

export function midiFrequency(midi: number): number {
  return A4_FREQUENCY_HZ * 2 ** ((midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

/** MIDI note of scale degree `degree` (degrees above the octave are allowed). */
export function degreeNote(scale: readonly number[], degree: number, midiBase: number): number {
  const octave = Math.floor(degree / scale.length);
  const index = degree - octave * scale.length;
  return midiBase + SEMITONES_PER_OCTAVE * octave + (scale[index] ?? 0);
}
