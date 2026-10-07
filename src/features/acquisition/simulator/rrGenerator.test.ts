import { describe, it, expect } from 'vitest';
import { RR_UNITS_PER_SECOND } from '../rrUnits';
import { SCENARIOS, PROGRESSIVE_TRANSITION_MS, type ScenarioId } from '../../acquisition/simulator/scenarios';
import { createRrGenerator, type Beat } from './rrGenerator';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function generateUntil(id: ScenarioId, seed: number, untilMs: number): Beat[] {
  const generator = createRrGenerator(SCENARIOS[id], seed);
  const beats: Beat[] = [];
  let beat = generator.next();
  while (beat.endMs <= untilMs) {
    beats.push(beat);
    beat = generator.next();
  }
  return beats;
}

function meanHr(rr: readonly number[]): number {
  return 60000 / (rr.reduce((s, x) => s + x, 0) / rr.length);
}

// Minimal reference implementation for the tests; the production one lives in the signal feature.
function rmssd(rr: readonly number[]): number {
  let sum = 0;
  for (let i = 1; i < rr.length; i++) {
    sum += ((rr[i] ?? 0) - (rr[i - 1] ?? 0)) ** 2;
  }
  return Math.sqrt(sum / (rr.length - 1));
}

describe('createRrGenerator', () => {
  it.each([1, 2, 3])('progressive activation is reproducible with seed %i and reaches activation values', (seed) => {
    const beats = generateUntil('progressive_activation', seed, PROGRESSIVE_TRANSITION_MS + 120_000);
    expect(beats).toEqual(generateUntil('progressive_activation', seed, PROGRESSIVE_TRANSITION_MS + 120_000));
    expect(meanHr(beats.filter(b => b.endMs <= 60_000).map(b => b.rrMs))).toBeLessThan(66);
    expect(meanHr(beats.filter(b => b.endMs > PROGRESSIVE_TRANSITION_MS).map(b => b.rrMs))).toBeGreaterThan(90);
    expect(SCENARIOS.progressive_activation.paramsAt(-1)).toEqual(SCENARIOS.rest.paramsAt(0));
    expect(SCENARIOS.progressive_activation.paramsAt(PROGRESSIVE_TRANSITION_MS)).toEqual(SCENARIOS.activation.paramsAt(0));
  });
  it('is deterministic for the same seed and scenario', () => {
    expect(generateUntil('rest', 99, 60_000)).toEqual(generateUntil('rest', 99, 60_000));
  });

  it('changes the series with another seed', () => {
    expect(generateUntil('rest', 1, 60_000)).not.toEqual(generateUntil('rest', 2, 60_000));
  });

  it('quantizes each interval to 1/1024 s and accumulates time without drift', () => {
    const beats = generateUntil('activation', 5, 60_000);
    let accumulated = 0;
    for (const { rrMs, endMs } of beats) {
      expect(Number.isInteger((rrMs * RR_UNITS_PER_SECOND) / 1000)).toBe(true);
      accumulated += rrMs;
      expect(endMs).toBe(accumulated);
    }
  });

  it.each([1, 2, 3])('rest (seed %i): HR ≈ 62 bpm and RMSSD ≈ 45 ms', (seed) => {
    const rr = generateUntil('rest', seed, FIVE_MINUTES_MS).map((l) => l.rrMs);
    expect(meanHr(rr)).toBeGreaterThan(60);
    expect(meanHr(rr)).toBeLessThan(64);
    expect(rmssd(rr)).toBeGreaterThan(35);
    expect(rmssd(rr)).toBeLessThan(60);
  });

  it.each([1, 2, 3])('activation (seed %i): HR ≈ 92 bpm and RMSSD ≈ 10 ms', (seed) => {
    const rr = generateUntil('activation', seed, FIVE_MINUTES_MS).map((l) => l.rrMs);
    expect(meanHr(rr)).toBeGreaterThan(90);
    expect(meanHr(rr)).toBeLessThan(94);
    expect(rmssd(rr)).toBeGreaterThan(5);
    expect(rmssd(rr)).toBeLessThan(20);
  });

  it('keeps the rest series with seed 1 exactly (regression)', () => {
    const generator = createRrGenerator(SCENARIOS.rest, 1);
    expect(Array.from({ length: 6 }, () => generator.next().rrMs)).toEqual([
      949.21875, 1024.4140625, 937.5, 894.53125, 910.15625, 1029.296875,
    ]);
  });

  describe('artifacts scenario', () => {
    const HORIZON_MS = 30 * 60 * 1000;

    const withArtifacts = generateUntil('artifacts', 1, HORIZON_MS);
    const baseEnds = new Set(generateUntil('rest', 1, HORIZON_MS).map((l) => l.endMs));
    // A premature beat is the only one ending at an instant that does not exist
    // in the base series (the compensatory one lines up with it again).
    const prematureBeats = withArtifacts
      .map((beat, i) => ({ beat, i }))
      .filter(({ beat }) => !baseEnds.has(beat.endMs));

    it('is deterministic', () => {
      expect(generateUntil('artifacts', 4, 120_000)).toEqual(generateUntil('artifacts', 4, 120_000));
    });

    it('inserts premature beats at a rate close to 2 %', () => {
      const ratio = prematureBeats.length / withArtifacts.length;
      expect(ratio).toBeGreaterThan(0.01);
      expect(ratio).toBeLessThan(0.03);
    });

    it('each premature + compensatory pair keeps the rhythm of the base series', () => {
      expect(prematureBeats.length).toBeGreaterThan(0);
      for (const { beat, i } of prematureBeats) {
        const compensatory = withArtifacts[i + 1];
        expect(compensatory !== undefined && baseEnds.has(compensatory.endMs)).toBe(true);
        // The premature beat lasts ≈ 70 % of a normal RR: ≈ 0.7 / (0.7 + 1.3) of the pair.
        const fraction = beat.rrMs / (beat.rrMs + (compensatory?.rrMs ?? 0));
        expect(fraction).toBeGreaterThan(0.3);
        expect(fraction).toBeLessThan(0.4);
      }
    });
  });

  it('progressive relaxation: goes from activation to rest in 10 minutes', () => {
    const beats = generateUntil('progressive_relaxation', 1, PROGRESSIVE_TRANSITION_MS + 120_000);
    const firstMinute = beats.filter((l) => l.endMs <= 60_000).map((l) => l.rrMs);
    const afterTransition = beats
      .filter((l) => l.endMs > PROGRESSIVE_TRANSITION_MS)
      .map((l) => l.rrMs);

    expect(meanHr(firstMinute)).toBeGreaterThan(85);
    expect(meanHr(afterTransition)).toBeLessThan(65);
  });
});
