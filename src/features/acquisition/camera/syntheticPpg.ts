import { MS_PER_SECOND } from '../../../shared/time';
import { createRandom, standardNormal } from '../simulator/prng';
import type { FrameSample } from './pulseDetector';

/**
 * Synthetic fingertip recordings for the camera tests: frames whose beat
 * intervals are known, so the detector and the camera source are checked
 * against reference values without a phone.
 */

/** RR series of the documented nRF Connect macro (docs/prueba-ble.md), in ms. */
export const MACRO_RR: readonly number[] = [1000, 1015.625, 1000, 984.375, 968.75, 984.375, 1015.625, 1031.25];

/** Delivered frame rate of a typical phone camera. */
const FRAMES_PER_SECOND = 30;
const FRAME_MS = MS_PER_SECOND / FRAMES_PER_SECOND;
/** Time before the first beat and after the last one, in ms. */
const MARGIN_MS = 500;
/** Width of each beat's dip, in ms. */
const BEAT_WIDTH_MS = 90;
/** Brightness of the lit fingertip and depth of each beat's dip, 0–255. */
const FINGER_RED = 210;
const FINGER_GREEN = 40;
const BEAT_DEPTH = 8;
/** Slow drift caused by pressure changes: amplitude and period in ms. */
const DRIFT_AMPLITUDE = 6;
const DRIFT_PERIOD_MS = 20_000;
/** Sensor noise (standard deviation) and frame-time jitter (full range, ms). */
const NOISE = 0.4;
const JITTER_MS = 6;
/** An uncovered lens: dim and not dominated by red. */
const UNCOVERED_RED = 60;
const UNCOVERED_GREEN = 50;

export interface SyntheticPpg {
  readonly frames: FrameSample[];
  /**
   * Beat intervals the detector can find, in ms. The first one is left out:
   * its opening beat falls inside the detector's baseline window.
   */
  readonly rr: number[];
}

/**
 * Fingertip brightness at ~30 fps: each beat is a smooth dip in red, plus a
 * slow drift (pressure changes), sensor noise and frame-time jitter.
 *
 * @param beats Number of beat intervals; they cycle through MACRO_RR.
 * @param seed Seed of the noise, so every run is reproducible.
 * @param startMs Time of the first frame, like a camera timestamp.
 */
export function syntheticPpg(beats: number, seed = 1, startMs = 0): SyntheticPpg {
  const random = createRandom(seed);
  const rr = Array.from({ length: beats }, (_, i) => MACRO_RR[i % MACRO_RR.length] ?? MS_PER_SECOND);
  const beatTimes = rr.reduce<number[]>((times, interval) => [...times, (times.at(-1) ?? MARGIN_MS) + interval], [MARGIN_MS]);
  const endMs = (beatTimes.at(-1) ?? 0) + MARGIN_MS;
  const frames: FrameSample[] = [];
  for (let frame = 0; frame * FRAME_MS < endMs; frame++) {
    const timeMs = frame * FRAME_MS + (random() - 0.5) * JITTER_MS;
    const pulse = beatTimes.reduce((sum, beat) => sum + Math.exp(-(((timeMs - beat) / BEAT_WIDTH_MS) ** 2)), 0);
    const drift = DRIFT_AMPLITUDE * Math.sin((2 * Math.PI * timeMs) / DRIFT_PERIOD_MS);
    const red = FINGER_RED - BEAT_DEPTH * pulse + drift + NOISE * standardNormal(random);
    frames.push({ timeMs: startMs + timeMs, red, green: FINGER_GREEN });
  }
  return { frames, rr: rr.slice(1) };
}

/** Frames of an uncovered lens at ~30 fps, from `startMs` for `durationMs`. */
export function uncoveredFrames(startMs: number, durationMs: number): FrameSample[] {
  return Array.from({ length: Math.ceil(durationMs / FRAME_MS) }, (_, i) => ({
    timeMs: startMs + i * FRAME_MS,
    red: UNCOVERED_RED,
    green: UNCOVERED_GREEN,
  }));
}
