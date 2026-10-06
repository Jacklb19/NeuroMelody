import { describe, it, expect } from 'vitest';
import { fadeStartS, warningInstantS } from './durationWarnings';

describe('duration warnings', () => {
  it('the first warning comes when the plan ends', () => {
    expect(warningInstantS(20 * 60, 0)).toBe(1200);
    expect(warningInstantS(60 * 60, 0)).toBe(3600);
  });

  it('then warns every 60 continuous minutes', () => {
    expect([1, 2, 3].map((i) => warningInstantS(20 * 60, i))).toEqual([3600, 7200, 10800]);
    expect([1, 2].map((i) => warningInstantS(60 * 60, i))).toEqual([7200, 10800]);
  });

  it('the fade starts 2 minutes after the warning', () => {
    expect(fadeStartS(10 * 60, 0)).toBe(720);
    expect(fadeStartS(10 * 60, 1)).toBe(3720);
  });
});
