/**
 * Material musical fijo de la sesión (docs/diseno-musical.md): centro tonal
 * en re, bordón una octava abajo y los tres modos de los niveles.
 */

/** Re3 (≈ 146,8 Hz): centro tonal fijo durante toda la sesión. */
export const MIDI_TONICA = 50;
/** Re2, una octava bajo la tónica. */
export const MIDI_BORDON = MIDI_TONICA - 12;

/** Modos, en el orden en que los recibe el parámetro `modo` del sintetizador. */
export const MODO = {
  pentatonicaMayor: 0,
  lidio: 1,
  bordonPentatonica: 2,
} as const;

export type Modo = (typeof MODO)[keyof typeof MODO];

/**
 * Semitonos sobre la tónica. La pentatónica mayor de re (re, mi, fa#, la, si)
 * está contenida en el lidio de re, así que los fundidos entre ambos
 * comparten notas.
 */
export const ESCALAS: Readonly<Record<Modo, readonly number[]>> = {
  [MODO.pentatonicaMayor]: [0, 2, 4, 7, 9],
  [MODO.lidio]: [0, 2, 4, 6, 7, 9, 11],
  [MODO.bordonPentatonica]: [0, 2, 4, 7, 9],
};

export function esModo(valor: number): valor is Modo {
  return valor === MODO.pentatonicaMayor || valor === MODO.lidio || valor === MODO.bordonPentatonica;
}

export function frecuenciaMidi(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Nota MIDI del grado `grado` de la escala (admite grados por encima de la octava). */
export function notaDeGrado(escala: readonly number[], grado: number, midiBase: number): number {
  const octava = Math.floor(grado / escala.length);
  const indice = grado - octava * escala.length;
  return midiBase + 12 * octava + (escala[indice] ?? 0);
}
