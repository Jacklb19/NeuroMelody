import { describe, expect, it } from 'vitest';
import { linePath, nearestIndex, plotX, plotY, roundDomain } from './trendChartGeometry';

describe('roundDomain', () => {
  it('rounds outwards to the step and ignores missing values', () => {
    expect(roundDomain([62, null, 78], 10)).toEqual({ min: 60, max: 80 });
  });

  it('gives a flat series some height and has no axis without values', () => {
    expect(roundDomain([70, 70], 10)).toEqual({ min: 70, max: 80 });
    expect(roundDomain([null], 10)).toBeNull();
  });
});

describe('plot coordinates', () => {
  it('spreads points from left to right and centres a lone one', () => {
    expect([0, 1, 2].map((index) => plotX(index, 3))).toEqual([0, 50, 100]);
    expect(plotX(0, 1)).toBe(50);
  });

  it('puts the highest value at the top', () => {
    const domain = { min: 0, max: 10 };
    expect(plotY(10, domain)).toBe(0);
    expect(plotY(0, domain)).toBe(100);
  });
});

describe('linePath', () => {
  it('breaks the line at a missing value', () => {
    expect(linePath([0, 10, null, 10], { min: 0, max: 10 }))
      .toBe('M0.00,100.00 L33.33,0.00 M100.00,0.00');
  });
});

describe('nearestIndex', () => {
  it('snaps to the closest point and stays inside the series', () => {
    expect(nearestIndex(0.4, 3)).toBe(1);
    expect(nearestIndex(1.3, 3)).toBe(2);
    expect(nearestIndex(-0.2, 3)).toBe(0);
    expect(nearestIndex(0.9, 1)).toBe(0);
  });
});
