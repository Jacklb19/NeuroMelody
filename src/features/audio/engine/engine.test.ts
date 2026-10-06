import { describe, it, expect } from 'vitest';
import { readPlaybackStats } from '../engine/playbackStats';
import { LEVEL_IDS, LEVELS, CALIBRATION_LEVEL } from './levels';
import { dbToGain, tempoRampDurationS, gainToDb } from './ramps';
import { generateImpulseResponse } from './impulseResponse';

describe('ramps', () => {
  it.each([
    [66, 76, 20],
    [76, 66, 20],
    [66, 59, 20],
    [76, 59, 34],
    [66, 66, 20],
  ])('de %i a %i BPM dura %i s', (from, to, expected) => {
    expect(tempoRampDurationS(from, to)).toBe(expected);
  });

  it('is never shorter than 20 s (RNF-03)', () => {
    for (let from = 40; from <= 120; from += 1) {
      for (let to = 40; to <= 120; to += 7) {
        expect(tempoRampDurationS(from, to)).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it('converts between dB and gain', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-12)).toBeCloseTo(0.2512, 4);
    expect(gainToDb(0.5)).toBeCloseTo(-6.0206, 4);
  });
});

describe('music levels', () => {
  it('match the approved table', () => {
    expect(LEVEL_IDS.map((id) => {
      const n = LEVELS[id];
      return [n.tempo, n.mode, n.layers, n.brightnessHz, n.reverb];
    })).toEqual([
      [76, 0, 3, 6000, 0.25],
      [66, 1, 2, 3500, 0.35],
      [59, 2, 2, 2000, 0.5],
    ]);
    expect(CALIBRATION_LEVEL).toBe('intermediate');
  });

  it('the target tempo is between 58 and 60 BPM', () => {
    expect(LEVELS.target.tempo).toBeGreaterThanOrEqual(58);
    expect(LEVELS.target.tempo).toBeLessThanOrEqual(60);
  });
});

describe('generateImpulseResponse', () => {
  const [left, right] = generateImpulseResponse(48_000);

  function energy(channel: Float32Array, from: number, to: number): number {
    let sum = 0;
    for (let i = from; i < to; i++) {
      sum += (channel[i] ?? 0) ** 2;
    }
    return sum;
  }

  it('lasts 3.5 s in two different channels', () => {
    expect(left.length).toBe(168_000);
    expect(right.length).toBe(168_000);
    expect(right).not.toEqual(left);
  });

  it('decays exponentially: the last tenth has far less energy than the first', () => {
    const tenth = left.length / 10;
    expect(energy(left, 9 * tenth, left.length)).toBeLessThan(
      energy(left, 0, tenth) * 1e-4,
    );
  });

  it('starts at zero, without a click, and is deterministic', () => {
    expect(Math.abs(left[0] ?? 1)).toBe(0);
    expect(generateImpulseResponse(48_000)[0]).toEqual(left);
  });
});

describe('readPlaybackStats', () => {
  it('returns null without the API or with incomplete data', () => {
    expect(readPlaybackStats({})).toBeNull();
    expect(readPlaybackStats(null)).toBeNull();
    expect(readPlaybackStats({ playbackStats: { underrunEvents: 1 } })).toBeNull();
  });
});
