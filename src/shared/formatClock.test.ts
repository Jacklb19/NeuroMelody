import { describe, expect, it } from 'vitest';
import { formatClock } from './formatClock';

describe('formatClock', () => {
  it('pads minutes and seconds to two digits', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(245.9)).toBe('04:05');
  });

  it('keeps counting minutes past the hour and never goes negative', () => {
    expect(formatClock(3661)).toBe('61:01');
    expect(formatClock(-3)).toBe('00:00');
  });
});
