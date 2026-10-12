import { describe, expect, it } from 'vitest';
import { createRandom } from '../../acquisition/simulator/prng';
import { ARRANGEMENTS } from './arrangement';
import { BankComposer, TICKS_PER_BEAT } from './composer';
import { LAYER } from './layers';
import { MIDI_TONIC, MODE, SCALES, SEMITONES_PER_OCTAVE, type Mode } from './theory';
import type { NoteSink } from './voices';

const MODES: readonly Mode[] = Object.values(MODE);
/** Twenty minutes at 66 beats per minute: long enough to meet every progression and many motifs. */
const LONG_RUN_TICKS = 20 * 66 * TICKS_PER_BEAT;
/** The melody lives between D4 and the degree 1.6 octaves above it (composer.ts). */
const MELODY_LOW = MIDI_TONIC + SEMITONES_PER_OCTAVE;
const MELODY_HIGH = MELODY_LOW + 2 * SEMITONES_PER_OCTAVE;

interface Strike {
  readonly tick: number;
  readonly midi: number;
  readonly layer: number;
  readonly velocity: number;
}

/** Records what the composer asks for instead of sounding it. */
class Recorder implements NoteSink {
  tick = 0;
  readonly strikes: Strike[] = [];
  readonly chords: (readonly number[])[] = [];
  releases = 0;

  strike(midi: number, _timbre: unknown, _pan: number, velocity: number, _delayS: number, layer: number): void {
    this.strikes.push({ tick: this.tick, midi, layer, velocity });
  }
  holdChord(notes: readonly number[]): void {
    this.chords.push(notes);
  }
  releaseChord(): void {
    this.releases++;
  }
}

/** Slow moods of the session the composer is given on every tick; the middle of their ranges. */
const DENSITY = 0.5;
const LIFT = 0.5;

function run(mode: Mode, seed: number, ticks: number, harmony = true, melody = true): Recorder {
  const recorder = new Recorder();
  const composer = new BankComposer(0, mode, createRandom(seed), createRandom(seed + 1), recorder);
  for (let tick = 0; tick < ticks; tick++) {
    recorder.tick = tick;
    composer.onTick(tick, harmony, melody, DENSITY, LIFT);
  }
  return recorder;
}

function isInScale(mode: Mode, midi: number): boolean {
  return SCALES[mode].includes((((midi - MIDI_TONIC) % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE);
}

describe('BankComposer', () => {
  it.each(MODES)('mode %i keeps every note in its scale and the melody in its range', (mode) => {
    const { strikes } = run(mode, 3, LONG_RUN_TICKS);
    const melody = strikes.filter((strike) => strike.layer === LAYER.melody);
    expect(melody.length).toBeGreaterThan(100);
    for (const strike of strikes) {
      expect(isInScale(mode, strike.midi)).toBe(true);
      expect(strike.velocity).toBeGreaterThan(0);
      expect(strike.velocity).toBeLessThanOrEqual(1);
    }
    for (const strike of melody) {
      expect(strike.midi).toBeGreaterThanOrEqual(MELODY_LOW);
      expect(strike.midi).toBeLessThanOrEqual(MELODY_HIGH);
    }
  });

  it.each(MODES)('mode %i holds a chord of its catalog on every chord change, starting at the first beat', (mode) => {
    const { chords, beatsPerChord } = ARRANGEMENTS[mode];
    const recorder = run(mode, 5, LONG_RUN_TICKS, true, false);
    expect(recorder.chords).toHaveLength(LONG_RUN_TICKS / TICKS_PER_BEAT / beatsPerChord);
    for (const chord of recorder.chords) {
      expect(chords).toContain(chord);
    }
    expect(recorder.releases).toBe(0);
  });

  it('leaves silences between phrases: the melody rests at least as much as it plays', () => {
    const { strikes } = run(MODE.majorPentatonic, 9, LONG_RUN_TICKS);
    const ticksWithMelody = new Set(strikes.filter((s) => s.layer === LAYER.melody).map((s) => s.tick));
    expect(ticksWithMelody.size).toBeLessThan(LONG_RUN_TICKS / 2);
  });

  it('lets the chord go once the harmony layer is no longer heard, and plays nothing above it', () => {
    const recorder = new Recorder();
    const composer = new BankComposer(0, MODE.lydian, createRandom(1), createRandom(2), recorder);
    composer.onTick(0, true, false, DENSITY, LIFT);
    expect(recorder.chords).toHaveLength(1);
    for (let tick = 1; tick < LONG_RUN_TICKS; tick++) {
      composer.onTick(tick, false, false, DENSITY, LIFT);
    }
    expect(recorder.releases).toBe(1);
    expect(recorder.chords).toHaveLength(1);
    expect(recorder.strikes).toHaveLength(0);
  });
});
