import { describe, it, expect } from 'vitest';
import { CEILING, softClipBlock, softClip } from './softClip';

describe('softClip', () => {
  it('the ceiling is −1 dBFS', () => {
    expect(20 * Math.log10(CEILING)).toBeCloseTo(-1, 10);
  });

  it.each([1, 2, 10, 1e6, -1, -10, -1e6])('nunca supera el techo con la entrada %s', (x) => {
    expect(Math.abs(softClip(x))).toBeLessThanOrEqual(CEILING);
  });

  it('barely changes small signals', () => {
    expect(softClip(0)).toBe(0);
    expect(softClip(0.1)).toBeCloseTo(0.1, 2);
    expect(Math.abs(softClip(0.1) - 0.1) / 0.1).toBeLessThan(0.005);
  });

  it('is monotonic and symmetric', () => {
    let previous = softClip(-3);
    for (let x = -3; x <= 3; x += 0.01) {
      const value = softClip(x);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(softClip(-x)).toBeCloseTo(-value, 12);
      previous = value;
    }
  });
});

describe('softClipBlock', () => {
  it('clips in place and returns the peak', () => {
    const block = new Float32Array([0.1, -5, 0.5, 3]);
    const peak = softClipBlock(block);
    expect(Math.max(...Array.from(block, Math.abs))).toBeLessThanOrEqual(CEILING);
    expect(peak).toBeCloseTo(Math.abs(block[1] ?? 0), 6);
  });
});
