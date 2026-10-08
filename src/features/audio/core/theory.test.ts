import { describe, it, expect } from 'vitest';
import { SCALES, MIDI_DRONE, MIDI_TONIC, MODE, isMode, midiFrequency, degreeNote, modeName, type ModeName } from './theory';

describe('session music theory', () => {
  it('uses D3 as the tonic and D2 as the drone', () => {
    expect(midiFrequency(MIDI_TONIC)).toBeCloseTo(146.832, 3);
    expect(midiFrequency(MIDI_DRONE)).toBeCloseTo(73.416, 3);
    expect(midiFrequency(69)).toBe(440);
  });

  it('D major pentatonic is contained in D lydian', () => {
    const lydian = new Set(SCALES[MODE.lydian]);
    expect(SCALES[MODE.majorPentatonic].every((s) => lydian.has(s))).toBe(true);
    expect(SCALES[MODE.dronePentatonic]).toEqual(SCALES[MODE.majorPentatonic]);
  });

  it('computes degree notes, also above the octave', () => {
    const pentatonic = SCALES[MODE.majorPentatonic];
    expect(degreeNote(pentatonic, 0, 50)).toBe(50); // D
    expect(degreeNote(pentatonic, 3, 50)).toBe(57); // A
    expect(degreeNote(pentatonic, 5, 50)).toBe(62); // D one octave up
    expect(degreeNote(pentatonic, 7, 50)).toBe(66); // F#
  });

  it('recognizes only the three modes', () => {
    expect([0, 1, 2].every(isMode)).toBe(true);
    expect(isMode(3)).toBe(false);
    expect(isMode(-1)).toBe(false);
  });

  it('names every mode by its key, whatever its numeric value', () => {
    for (const name of Object.keys(MODE) as ModeName[]) {
      expect(modeName(MODE[name])).toBe(name);
    }
  });
});
