import { describe, it, expect } from 'vitest';
import { SCALES, MIDI_DRONE, MIDI_TONIC, MODE, isMode, midiFrequency, degreeNote } from './theory';

describe('teoría musical de la sesión', () => {
  it('usa re3 como tónica y re2 como bordón', () => {
    expect(midiFrequency(MIDI_TONIC)).toBeCloseTo(146.832, 3);
    expect(midiFrequency(MIDI_DRONE)).toBeCloseTo(73.416, 3);
    expect(midiFrequency(69)).toBe(440);
  });

  it('la pentatónica mayor de re está contenida en el lidio de re', () => {
    const lydian = new Set(SCALES[MODE.lydian]);
    expect(SCALES[MODE.majorPentatonic].every((s) => lydian.has(s))).toBe(true);
    expect(SCALES[MODE.dronePentatonic]).toEqual(SCALES[MODE.majorPentatonic]);
  });

  it('calcula notas de grado, también por encima de la octava', () => {
    const pentatonic = SCALES[MODE.majorPentatonic];
    expect(degreeNote(pentatonic, 0, 50)).toBe(50); // re
    expect(degreeNote(pentatonic, 3, 50)).toBe(57); // la
    expect(degreeNote(pentatonic, 5, 50)).toBe(62); // re una octava arriba
    expect(degreeNote(pentatonic, 7, 50)).toBe(66); // fa#
  });

  it('reconoce solo los tres modos', () => {
    expect([0, 1, 2].every(isMode)).toBe(true);
    expect(isMode(3)).toBe(false);
    expect(isMode(-1)).toBe(false);
  });
});
