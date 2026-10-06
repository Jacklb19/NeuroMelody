import { describe, it, expect } from 'vitest';
import { createRandom, standardNormal } from './prng';

describe('createRandom (mulberry32)', () => {
  it('reproduces the reference values of the canonical implementation', () => {
    const random = createRandom(1);
    expect(random()).toBe(0.6270739405881613);
    expect(random()).toBe(0.002735721180215478);
    expect(random()).toBe(0.5274470399599522);
  });

  it('yields the same sequence for the same seed and another for a different seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const c = createRandom(43);
    const seriesA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seriesA);
    expect(Array.from({ length: 5 }, c)).not.toEqual(seriesA);
  });

  it('returns values in [0, 1)', () => {
    const random = createRandom(7);
    for (let i = 0; i < 10_000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('standardNormal', () => {
  it('has mean ≈ 0 and deviation ≈ 1', () => {
    const random = createRandom(2026);
    const n = 20_000;
    const samples = Array.from({ length: n }, () => standardNormal(random));
    const mean = samples.reduce((s, x) => s + x, 0) / n;
    const variance = samples.reduce((s, x) => s + (x - mean) ** 2, 0) / n;

    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.sqrt(variance)).toBeCloseTo(1, 1);
  });

  it('produces no non-finite values when the generator returns 0', () => {
    expect(Number.isFinite(standardNormal(() => 0))).toBe(true);
  });
});
