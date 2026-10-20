import { describe, expect, it } from 'vitest';
import { PulseDetector, type FrameSample } from './pulseDetector';
import { syntheticPpg } from './syntheticPpg';
import { CONTACT_GRACE_MS } from './config';

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

  it('rides out a brief slip of the finger but starts over when it leaves the lens', () => {
    const { frames } = syntheticPpg(10);
    const detector = new PulseDetector();
    frames.slice(0, 150).forEach((frame) => detector.push(frame));
    const lastMs = frames[149]?.timeMs ?? 0;
    detector.push({ timeMs: lastMs + 33, red: 60, green: 50 });
    detector.push({ timeMs: lastMs + 33 + CONTACT_GRACE_MS, red: 60, green: 50 });
    expect(detector.fingerDetected).toBe(true);
    detector.push({ timeMs: lastMs + 34 + CONTACT_GRACE_MS, red: 60, green: 50 });
    expect(detector.fingerDetected).toBe(false);
    expect(detector.waveform).toHaveLength(0);
  });

  it('keeps every beat through one-frame slips, at camera rates from 15 to 60 frames per second', () => {
    for (const framesPerSecond of [15, 24, 30, 60]) {
      const { frames, rr } = syntheticPpg(30, { shape: 'pulse', framesPerSecond, slipsAtMs: [8000, 16000, 24000] });
      const detected = detect(frames);
      expect(detected).toHaveLength(rr.length);
      detected.forEach((interval, i) => { expect(Math.abs(interval - (rr[i] ?? 0))).toBeLessThan(20); });
    }
  });

  it('says the image is too bright when most pixels sit at the channel maximum', () => {
    const detector = new PulseDetector();
    syntheticPpg(4, { brightness: 300 }).frames.forEach((frame) => detector.push(frame));
    expect(detector.saturated).toBe(true);
    const normal = new PulseDetector();
    syntheticPpg(4).frames.forEach((frame) => normal.push(frame));
    expect(normal.saturated).toBe(false);
  });
});
