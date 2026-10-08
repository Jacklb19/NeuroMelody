import { describe, expect, it } from 'vitest';
import { sparklinePath } from './sparklinePath';

describe('sparklinePath', () => {
  it('maps the lowest value to the bottom and the highest to the top', () => {
    expect(sparklinePath([10, 20, 30])).toBe('M0.00,32.00 L50.00,16.00 L100.00,0.00');
  });

  it('breaks the line at missing values', () => {
    expect(sparklinePath([10, null, 30, 20])).toBe('M0.00,32.00 M66.67,0.00 L100.00,16.00');
  });

  it('draws a flat series across the middle', () => {
    expect(sparklinePath([5, 5])).toBe('M0.00,16.00 L100.00,16.00');
  });

  it('draws nothing without values', () => {
    expect(sparklinePath([null, null])).toBe('');
  });
});
