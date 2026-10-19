/**
 * What each mode plays (docs/diseno-musical.md): its chords, the orders in
 * which they follow each other and what moves above them. Everything is
 * written out by hand so the voices of one chord lead smoothly into the next;
 * the tests check that property for every progression.
 *
 * Notes are semitones above the tonic (D3). The drone already gives the bass,
 * so the chords sit above it, from A3 to C#5.
 */
import { MODE, type Mode } from './theory';
import type { TimbreRole } from './instruments';

/** What plays above the chords of a mode, inside the harmony layer. */
export const FIGURE = {
  /** Nothing: the melody layer leads. */
  none: 0,
  /** Single notes of the chord, one every two beats. */
  brokenChord: 1,
  /** Sparse high notes on loops of different lengths. */
  chimes: 2,
} as const;

export type Figure = (typeof FIGURE)[keyof typeof FIGURE];

export interface Arrangement {
  /** Beats each chord lasts; a divisor of the 16-beat harmonic cycle. */
  readonly beatsPerChord: number;
  /** Chords, each from its lowest note to its highest. */
  readonly chords: readonly (readonly number[])[];
  /** Orders in which the chords are played, as indexes into `chords`. One is drawn each time the previous ends. */
  readonly progressions: readonly (readonly number[])[];
  /** Part the chords belong to: the instrument of the session decides how it sounds (ADR-46). */
  readonly padRole: TimbreRole;
  readonly figure: Figure;
}

export const ARRANGEMENTS: Readonly<Record<Mode, Arrangement>> = {
  // High activation: a chord every 4 beats, in close position, under the melody.
  [MODE.majorPentatonic]: {
    beatsPerChord: 4,
    chords: [
      [7, 12, 14, 16], // D add9
      [7, 9, 12, 16], // B minor 7
      [7, 9, 12, 14], // E7 sus4
      [9, 12, 14, 19], // A sus
      [7, 9, 14, 16], // F# minor 11
      [9, 12, 14, 16], // D 6/9
    ],
    progressions: [
      [0, 1, 2, 3],
      [0, 4, 1, 3],
      [5, 1, 4, 2],
      [0, 5, 2, 3],
    ],
    padRole: 'pad',
    figure: FIGURE.none,
  },
  // Intermediate: wider chords that last 8 beats, with the raised fourth (G#) that makes lydian float.
  [MODE.lydian]: {
    beatsPerChord: 8,
    chords: [
      [7, 14, 16, 23], // D major 9
      [9, 14, 18, 21], // E over D
      [7, 12, 16, 21], // B minor 7
      [7, 14, 18, 23], // A major 7
      [7, 14, 16, 21], // F# minor 11
    ],
    progressions: [
      [0, 1, 0, 2],
      [0, 3, 2, 1],
      [0, 4, 1, 2],
      [0, 1, 3, 4],
    ],
    padRole: 'slowPad',
    figure: FIGURE.brokenChord,
  },
  // Target: open fifths and fourths over the drone, 8 beats each.
  [MODE.dronePentatonic]: {
    beatsPerChord: 8,
    chords: [
      [12, 19], // D–A
      [7, 14], // A–E
      [14, 21], // E–B
      [9, 16], // B–F#
      [7, 12], // A–D
    ],
    progressions: [
      [0, 1, 4, 1],
      [0, 3, 4, 1],
      [0, 2, 3, 1],
      [0, 1, 0, 3],
    ],
    padRole: 'dyad',
    figure: FIGURE.chimes,
  },
  // For falling asleep: the lower dyads, a whole cycle each, and nothing struck above them.
  [MODE.deepDrone]: {
    beatsPerChord: 16,
    chords: [
      [7, 14], // A–E
      [12, 19], // D–A
      [7, 12], // A–D
      [9, 16], // B–F#
    ],
    progressions: [
      [0, 1, 0, 3],
      [0, 2, 3, 1],
      [0, 3, 0, 2],
    ],
    padRole: 'sleepPad',
    figure: FIGURE.none,
  },
};

/** The largest chord of the catalog: the size of the buffers that hold one. */
export const MAX_CHORD_NOTES = 4;

export interface ChimeLoop {
  /** Semitones above the tonic; every note belongs to the pentatonic scale. */
  readonly semitones: number;
  /** Beats between two soundings of the note. */
  readonly periodBeats: number;
}

/**
 * Chimes of the target level. Each note repeats on its own loop and the loop
 * lengths share no common divisor, so the pattern they draw together takes
 * hours to come back: familiar notes that never line up the same way twice.
 */
export const CHIME_LOOPS: readonly ChimeLoop[] = [
  { semitones: 24, periodBeats: 19 },
  { semitones: 19, periodBeats: 23 },
  { semitones: 26, periodBeats: 29 },
  { semitones: 21, periodBeats: 31 },
  { semitones: 28, periodBeats: 37 },
  { semitones: 31, periodBeats: 43 },
];
