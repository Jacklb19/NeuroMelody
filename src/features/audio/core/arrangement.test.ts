import { describe, expect, it } from 'vitest';
import { ARRANGEMENTS, CHIME_LOOPS, MAX_CHORD_NOTES } from './arrangement';
import { BEATS_PER_CYCLE } from './SynthesisCore';
import { MIDI_DRONE, MIDI_TONIC, MODE, SCALES, SEMITONES_PER_OCTAVE, type Mode } from './theory';
import { DRONE_PARTIALS } from './timbres';

const MODES: readonly Mode[] = Object.values(MODE);
/** A semitone and a minor ninth: the two intervals that grate between sustained notes. */
const HARSH_INTERVALS = [1, SEMITONES_PER_OCTAVE + 1];
/** Farthest a voice may move from one chord to the next, in semitones (a fourth). */
const MAX_VOICE_MOVE = 5;

function isInScale(mode: Mode, semitones: number): boolean {
  return SCALES[mode].includes(((semitones % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE);
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

describe('arrangements', () => {
  it.each(MODES)('mode %i only uses notes of its scale, from low to high, in chords that fit the buffers', (mode) => {
    for (const chord of ARRANGEMENTS[mode].chords) {
      expect(chord.length).toBeLessThanOrEqual(MAX_CHORD_NOTES);
      expect([...chord].sort((a, b) => a - b)).toEqual(chord);
      for (const note of chord) {
        expect(isInScale(mode, note)).toBe(true);
      }
    }
  });

  it.each(MODES)('mode %i has no harsh interval inside a chord or against the drone', (mode) => {
    const drone = DRONE_PARTIALS.map((partial) => MIDI_DRONE + partial.semitones);
    for (const chord of ARRANGEMENTS[mode].chords) {
      const notes = chord.map((note) => MIDI_TONIC + note);
      for (const note of notes) {
        for (const other of [...notes, ...drone]) {
          expect(HARSH_INTERVALS).not.toContain(Math.abs(note - other));
        }
      }
    }
  });

  it.each(MODES)('mode %i leads every voice by a fourth at most, also into the next progression', (mode) => {
    const { chords, progressions } = ARRANGEMENTS[mode];
    const starts = progressions.map((progression) => progression[0]);
    for (const progression of progressions) {
      progression.forEach((index, step) => {
        const chord = chords[index];
        expect(chord).toBeDefined();
        // After its last chord any progression may follow, so each of their first chords is a neighbour.
        const next = step + 1 < progression.length ? [progression[step + 1]] : starts;
        for (const nextIndex of next) {
          const following = chords[nextIndex ?? -1];
          expect(following).toHaveLength(chord?.length ?? 0);
          following?.forEach((note, voice) => {
            expect(Math.abs(note - (chord?.[voice] ?? 0))).toBeLessThanOrEqual(MAX_VOICE_MOVE);
          });
        }
      });
    }
  });

  it.each(MODES)('mode %i changes chord on a divisor of the harmonic cycle', (mode) => {
    expect(BEATS_PER_CYCLE % ARRANGEMENTS[mode].beatsPerChord).toBe(0);
  });

  it('gives the chimes pentatonic notes on loops that never realign', () => {
    CHIME_LOOPS.forEach((loop, index) => {
      expect(isInScale(MODE.dronePentatonic, loop.semitones)).toBe(true);
      for (const other of CHIME_LOOPS.slice(index + 1)) {
        expect(greatestCommonDivisor(loop.periodBeats, other.periodBeats)).toBe(1);
      }
    });
  });
});
