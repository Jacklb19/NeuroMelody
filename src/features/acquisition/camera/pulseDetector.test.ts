import { describe, expect, it } from 'vitest';
import { createRandom, standardNormal } from '../simulator/prng';
import { PulseDetector, type FrameSample } from './pulseDetector';

/** RR series of the documented nRF Connect macro (docs/prueba-ble.md), in ms. */
const MACRO_RR = [1000, 1015.625, 1000, 984.375, 968.75, 984.375, 1015.625, 1031.25];

interface Synthetic {
  readonly frames: FrameSample[];
  readonly rr: number[];
}

/**
 * Fingertip brightness at ~30 fps: each beat is a smooth dip in red, plus a
 * slow drift (pressure changes), sensor noise and frame-time jitter.
 */
function syntheticPpg(beats: number, seed = 1): Synthetic {
  const random = createRandom(seed);
  const rr = Array.from({ length: beats }, (_, i) => MACRO_RR[i % MACRO_RR.length] ?? 1000);
  const beatTimes = rr.reduce<number[]>((times, interval) => [...times, (times.at(-1) ?? 500) + interval], [500]);
  const endMs = (beatTimes.at(-1) ?? 0) + 500;
  const frames: FrameSample[] = [];
  for (let frame = 0; frame * (1000 / 30) < endMs; frame++) {
    const timeMs = frame * (1000 / 30) + (random() - 0.5) * 6;
    const pulse = beatTimes.reduce((sum, beat) => sum + Math.exp(-(((timeMs - beat) / 90) ** 2)), 0);
    const drift = 6 * Math.sin((2 * Math.PI * timeMs) / 20_000);
    const red = 210 - 8 * pulse + drift + 0.4 * standardNormal(random);
    frames.push({ timeMs, red, green: 40 });
  }
  return { frames, rr: rr.slice(1) };
}

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
