/**
 * Material musical fijo de la sesión (docs/diseno-musical.md): centro tonal
 * en re, bordón una octava abajo y los tres modos de los niveles.
 */

/** Re3 (≈ 146,8 Hz): centro tonal fijo durante toda la sesión. */
export const MIDI_TONIC = 50;
/** Re2, una octava bajo la tónica. */
export const MIDI_DRONE = MIDI_TONIC - 12;

/** Modos, en el orden en que los recibe el parámetro `modo` del sintetizador. */
export const MODE = {
  majorPentatonic: 0,
  lydian: 1,
  dronePentatonic: 2,
} as const;

export type Mode = (typeof MODE)[keyof typeof MODE];

/**
 * Semitonos sobre la tónica. La pentatónica mayor de re (re, mi, fa#, la, si)
 * está contenida en el lidio de re, así que los fundidos entre ambos
 * comparten notas.
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

/** Nota MIDI del grado `grado` de la escala (admite grados por encima de la octava). */
export function degreeNote(scale: readonly number[], degree: number, midiBase: number): number {
  const octave = Math.floor(degree / scale.length);
  const index = degree - octave * scale.length;
  return midiBase + 12 * octave + (scale[index] ?? 0);
}
