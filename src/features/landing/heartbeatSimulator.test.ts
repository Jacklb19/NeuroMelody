import { describe, expect, it } from 'vitest';
import { HERO_HEART } from './config';
import { HeartbeatSimulator } from './heartbeatSimulator';

describe('HeartbeatSimulator', () => {
  it('produces a resting rhythm with breathing variability, the same on every visit', () => {
    const reading = new HeartbeatSimulator().readingAt(60_000, 30);
    const meanHr = 60_000 / HERO_HEART.meanRrMs;
    expect(reading.heartRate).toBeGreaterThan(meanHr - 3);
    expect(reading.heartRate).toBeLessThan(meanHr + 3);
    expect(reading.rmssd).toBeGreaterThan(0);
    expect(new HeartbeatSimulator().readingAt(60_000, 30)).toEqual(reading);
  });

  it('restarts the phase at each beat', () => {
    const heart = new HeartbeatSimulator();
    expect(heart.phaseAt(0)).toBe(0);
    expect(heart.phaseAt(HERO_HEART.meanRrMs / 2)).toBeGreaterThan(0.3);
    expect(heart.phaseAt(HERO_HEART.meanRrMs * 1.2)).toBeLessThan(0.5);
  });
});
