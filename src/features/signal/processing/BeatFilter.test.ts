import { describe, it, expect } from 'vitest';
import { BeatFilter } from './BeatFilter';

function classifySeries(filter: BeatFilter, series: readonly number[]) {
  return series.map((rr) => filter.classify(rr));
}

function withReference(rr = 1000): BeatFilter {
  const filter = new BeatFilter();
  classifySeries(filter, [rr, rr, rr, rr, rr]);
  return filter;
}

describe('BeatFilter', () => {
  it('discards RR outside 300–2000 ms and accepts the bounds', () => {
    const filter = new BeatFilter();
    expect(filter.classify(299)).toEqual({ accepted: false, discardReason: 'out_of_range' });
    expect(filter.classify(2001)).toEqual({ accepted: false, discardReason: 'out_of_range' });
    expect(filter.classify(300).accepted).toBe(true);
    expect(filter.classify(2000).accepted).toBe(true);
  });

  it('accepts everything within range at startup until it has 5 beats', () => {
    const filter = new BeatFilter();
    const result = classifySeries(filter, [500, 1500, 700, 1900, 400]);
    expect(result.every((c) => c.accepted)).toBe(true);
  });

  it('applies the 20 % rule against the median of the last 5 accepted beats', () => {
    const filter = withReference(1000);
    expect(filter.classify(1210)).toEqual({ accepted: false, discardReason: 'deviation' });
    expect(filter.classify(790).accepted).toBe(false);
    expect(filter.classify(1190).accepted).toBe(true);
    expect(filter.classify(810).accepted).toBe(true);
  });

  it('accepts a deviation of exactly 20 %', () => {
    expect(withReference(1000).classify(1200).accepted).toBe(true);
    expect(withReference(1000).classify(800).accepted).toBe(true);
  });

  it('uses the median, which is not dragged by an accepted extreme value', () => {
    const filter = new BeatFilter();
    // Startup with a high accepted value: median of [1000, 1000, 1900, 1000, 1000] = 1000
    classifySeries(filter, [1000, 1000, 1900, 1000, 1000]);
    expect(filter.classify(1300).accepted).toBe(false);
    expect(filter.classify(1050).accepted).toBe(true);
  });

  it('discards a premature and compensatory pair (70 % and 130 %)', () => {
    const filter = withReference(1000);
    expect(classifySeries(filter, [700, 1300, 1000]).map((c) => c.accepted)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('recovers from a sustained step from 800 to 1000 ms', () => {
    const filter = new BeatFilter();
    const before = classifySeries(filter, Array.from({ length: 20 }, () => 800));
    const after = classifySeries(filter, Array.from({ length: 20 }, () => 1000));

    expect(before.every((c) => c.accepted)).toBe(true);
    // 1000 deviates 25 % from 800: the first 5 are discarded and reset the reference.
    expect(after.slice(0, 5).every((c) => c.discardReason === 'deviation')).toBe(true);
    expect(after.slice(5).every((c) => c.accepted)).toBe(true);
  });

  it('does not reset the reference if an accepted beat breaks the discard streak', () => {
    const filter = withReference(1000);
    classifySeries(filter, [1300, 1300, 1300, 1300]);
    expect(filter.classify(1000).accepted).toBe(true);
    const result = classifySeries(filter, [1300, 1300, 1300, 1300]);
    expect(result.every((c) => !c.accepted)).toBe(true);
    // The reference is still 1000
    expect(filter.classify(1000).accepted).toBe(true);
  });

  it('out-of-range RR do not alter the streak or the reference', () => {
    const filter = withReference(1000);
    classifySeries(filter, [1300, 1300, 2500, 1300, 1300, 100, 1300]);
    // Five deviation discards (ignoring the out-of-range ones) → reference 1300
    expect(filter.classify(1300).accepted).toBe(true);
  });

  it('reset forgets the reference and returns to startup', () => {
    const filter = withReference(1000);
    filter.reset();
    expect(classifySeries(filter, [600, 600, 600]).every((c) => c.accepted)).toBe(true);
  });
});
