import { describe, it, expect } from 'vitest';
import { computeTimeDomainIndices } from './timeDomainIndices';
import type { ClassifiedBeat } from './types';

function acceptedCount(rr: readonly number[]): ClassifiedBeat[] {
  let end = 0;
  return rr.map((rrMs) => {
    end += rrMs;
    return { endMs: end, rrMs, accepted: true, discardReason: null, contiguousWithPrevious: true };
  });
}

describe('computeTimeDomainIndices', () => {
  it('matches hand-computed values for a short series', () => {
    // NN = [800, 810, 790, 820]
    // Differences: 10, −20, 30 → RMSSD = √((100 + 400 + 900) / 3) = √466.67 = 21.602 ms
    // Mean 805; deviations −5, 5, −15, 15 → SDNN = √(500 / 3) = 12.910 ms
    // Mean HR = 60000 / 805 = 74.534 bpm
    const indices = computeTimeDomainIndices(acceptedCount([800, 810, 790, 820]));
    expect(indices.rmssd).toBeCloseTo(21.602, 3);
    expect(indices.sdnn).toBeCloseTo(12.91, 3);
    expect(indices.meanHr).toBeCloseTo(74.534, 3);
    expect(indices.validNn).toBe(4);
    expect(indices.nnDurationMs).toBe(3220);
  });

  it('gives zero RMSSD and SDNN for a constant series', () => {
    const indices = computeTimeDomainIndices(acceptedCount([1000, 1000, 1000]));
    expect(indices.rmssd).toBe(0);
    expect(indices.sdnn).toBe(0);
    expect(indices.meanHr).toBe(60);
  });

  it('returns nulls when there is not enough data', () => {
    expect(computeTimeDomainIndices([])).toEqual({
      meanHr: null,
      rmssd: null,
      sdnn: null,
      validNn: 0,
      nnDurationMs: 0,
    });
    const one = computeTimeDomainIndices(acceptedCount([900]));
    expect(one.meanHr).toBeCloseTo(66.667, 3);
    expect(one.rmssd).toBeNull();
    expect(one.sdnn).toBeNull();
  });

  it('excludes discarded beats and forms no pairs across them', () => {
    // 800, 810, [500 discarded], 790, 820
    // Valid pairs: (800, 810) and (790, 820) → differences 10 and 30
    // RMSSD = √((100 + 900) / 2) = √500 = 22.361 ms
    const series = acceptedCount([800, 810, 500, 790, 820]).map((beat, i) =>
      i === 2 ? { ...beat, accepted: false, discardReason: 'deviation' as const } : beat,
    );
    const indices = computeTimeDomainIndices(series);
    expect(indices.rmssd).toBeCloseTo(22.361, 3);
    expect(indices.validNn).toBe(4);
    expect(indices.sdnn).toBeCloseTo(12.91, 3);
  });

  it('forms no pair between beats on either side of a contact loss', () => {
    // 800, 810 | gap | 900, 910 → pairs (800, 810) and (900, 910); the 810 → 900 jump does not count
    const series = acceptedCount([800, 810, 900, 910]).map((beat, i) =>
      i === 2 ? { ...beat, contiguousWithPrevious: false } : beat,
    );
    expect(computeTimeDomainIndices(series).rmssd).toBeCloseTo(10, 6);
  });
});
