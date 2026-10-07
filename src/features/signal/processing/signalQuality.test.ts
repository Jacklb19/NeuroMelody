import { describe, it, expect } from 'vitest';
import { isAcceptanceLow, recentAcceptance, addSegment } from './signalQuality';
import type { ClassifiedBeat } from './types';

function beat(endMs: number, accepted: boolean): ClassifiedBeat {
  return {
    endMs,
    rrMs: 1000,
    accepted,
    discardReason: accepted ? null : 'deviation',
    contiguousWithPrevious: true,
  };
}

describe('recentAcceptance', () => {
  it('counts only the beats from the last 30 s', () => {
    const beats = [
      beat(5_000, false), // outside the window (t = 40 s → from 10 s)
      beat(15_000, true),
      beat(20_000, true),
      beat(30_000, true),
      beat(40_000, false),
    ];
    expect(recentAcceptance(beats, 40_000)).toBe(0.75);
  });

  it('returns null if no beat ended in the window', () => {
    expect(recentAcceptance([beat(1_000, true)], 60_000)).toBeNull();
  });
});

describe('isAcceptanceLow', () => {
  it('flags the signal as low with less than 80 % accepted', () => {
    const fourOfFive = [true, true, true, true, false].map((a, i) => beat(i * 1000 + 1000, a));
    const threeOfFive = [true, true, true, false, false].map((a, i) => beat(i * 1000 + 1000, a));
    expect(isAcceptanceLow(fourOfFive, 5_000)).toBe(false);
    expect(isAcceptanceLow(threeOfFive, 5_000)).toBe(true);
  });

  it('does not flag the signal as low when there are no recent beats (that is a gap)', () => {
    expect(isAcceptanceLow([], 5_000)).toBe(false);
  });
});

describe('addSegment', () => {
  it('merges segments that touch or overlap', () => {
    let segments = addSegment([], { startMs: 1000, endMs: 2000 });
    segments = addSegment(segments, { startMs: 2000, endMs: 3000 });
    segments = addSegment(segments, { startMs: 2500, endMs: 2800 });
    expect(segments).toEqual([{ startMs: 1000, endMs: 3000 }]);
  });

  it('appends a separate segment without modifying the original list', () => {
    const originals = [{ startMs: 1000, endMs: 2000 }];
    const segments = addSegment(originals, { startMs: 5000, endMs: 6000 });
    expect(segments).toHaveLength(2);
    expect(originals).toHaveLength(1);
  });
});
