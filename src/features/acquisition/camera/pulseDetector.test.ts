import { describe, expect, it } from 'vitest';
import { PulseDetector, type FrameSample } from './pulseDetector';
import { syntheticPpg } from './syntheticPpg';

function detect(frames: readonly FrameSample[]): number[] {
  const detector = new PulseDetector();
  return frames.flatMap((frame) => detector.push(frame));
}

describe('PulseDetector', () => {
  it('recovers known beat intervals within a few milliseconds despite 30 fps frames', () => {
    for (const seed of [1, 2, 3]) {
      const { frames, rr } = syntheticPpg(40, seed);
      const detected = detect(frames);
      // The first beats only fill the 1.5 s baseline; every later one must be found.
      expect(detected.length).toBeGreaterThanOrEqual(rr.length - 3);
      const expected = rr.slice(-detected.length);
      detected.forEach((interval, i) => {
        expect(Math.abs(interval - (expected[i] ?? 0))).toBeLessThan(15);
      });
    }
  });

  it('reports nothing while the lens is not covered by a lit finger', () => {
    const scene: FrameSample[] = Array.from({ length: 300 }, (_, i) => ({ timeMs: i * 33, red: 120, green: 110 }));
    const detector = new PulseDetector();
    expect(scene.flatMap((frame) => detector.push(frame))).toEqual([]);
    expect(detector.fingerDetected).toBe(false);
  });

  it('starts over when the finger leaves the lens', () => {
    const { frames } = syntheticPpg(10);
    const detector = new PulseDetector();
    frames.slice(0, 150).forEach((frame) => detector.push(frame));
    expect(detector.fingerDetected).toBe(true);
    detector.push({ timeMs: 6000, red: 60, green: 50 });
    expect(detector.fingerDetected).toBe(false);
    expect(detector.waveform).toHaveLength(0);
  });
});
