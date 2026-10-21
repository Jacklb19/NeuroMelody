import { MS_PER_SECOND } from '../../../shared/time';
import { createRandom, standardNormal } from '../simulator/prng';
import { CHANNEL_MAX } from './config';
import type { FrameSample } from './pulseDetector';

/**
 * Synthetic fingertip recordings for the camera tests: frames whose beat
 * intervals are known, so the detector and the camera source are checked
 * against reference values without a phone.
 */

/** RR series of the documented nRF Connect macro (docs/prueba-ble.md), in ms. */
export const MACRO_RR: readonly number[] = [1000, 1015.625, 1000, 984.375, 968.75, 984.375, 1015.625, 1031.25];

/** Delivered frame rate of a typical phone camera. */
const DEFAULT_FRAMES_PER_SECOND = 30;
/** Time before the first beat and after the last one, in ms. */
const MARGIN_MS = 500;
/** Width of each beat's dip in the simple shape, in ms. */
const BEAT_WIDTH_MS = 90;
/**
 * Realistic shape: a systolic wave after the foot of the pulse and a smaller
 * diastolic wave after the dicrotic notch (centre, width in ms, and relative height).
 */
const SYSTOLIC = { centreMs: 150, widthMs: 90, height: 1 } as const;
const DIASTOLIC = { centreMs: 420, widthMs: 110, height: 0.35 } as const;
/** Brightness of the lit fingertip and depth of each beat's dip, 0–255. */
const FINGER_RED = 210;
const FINGER_GREEN = 40;
const BEAT_DEPTH = 8;
/** Slow drift caused by pressure changes: amplitude and period in ms. */
const DRIFT_AMPLITUDE = 6;
const DRIFT_PERIOD_MS = 20_000;
/** Sensor noise (standard deviation) and frame-time jitter (full range, ms). */
const NOISE = 0.4;
const DEFAULT_JITTER_MS = 6;
/** An uncovered lens: dim and not dominated by red. */
const UNCOVERED_RED = 60;
const UNCOVERED_GREEN = 50;

export type SyntheticShape = 'dip' | 'pulse';

export interface SyntheticOptions {
  readonly seed?: number;
  /** Time of the first frame, like a camera timestamp. */
  readonly startMs?: number;
  readonly framesPerSecond?: number;
  readonly jitterMs?: number;
  /** `dip`: one symmetric dip per beat; `pulse`: systolic and diastolic waves, asymmetric. */
  readonly shape?: SyntheticShape;
  /** Every n-th frame is lost, as when the page is busy. */
  readonly dropEvery?: number;
  /** Each frame is delivered this many times with later timestamps, as animation frames faster than the camera do. */
  readonly repeats?: number;
  /** Frames near these times read as an uncovered lens for one frame, as when the finger slips. */
  readonly slipsAtMs?: readonly number[];
  /** Raises the finger's brightness so the channel clips at its maximum on the bright side. */
  readonly brightness?: number;
}

export interface SyntheticPpg {
  readonly frames: FrameSample[];
  /**
   * Beat intervals the detector can find, in ms. The first one is left out:
   * its opening beat falls inside the detector's baseline window.
   */
  readonly rr: number[];
}

function pulseAt(sinceFootMs: number, shape: SyntheticShape): number {
  if (shape === 'dip') return Math.exp(-((sinceFootMs / BEAT_WIDTH_MS) ** 2));
  const wave = (part: typeof SYSTOLIC | typeof DIASTOLIC): number => part.height * Math.exp(-(((sinceFootMs - part.centreMs) / part.widthMs) ** 2));
  return wave(SYSTOLIC) + wave(DIASTOLIC);
}

/**
 * Fingertip brightness: each beat darkens the red channel, plus a slow drift
 * (pressure changes), sensor noise and frame-time jitter.
 *
 * @param beats Number of beat intervals; they cycle through MACRO_RR.
 */
export function syntheticPpg(beats: number, seedOrOptions: number | SyntheticOptions = 1, startMs = 0): SyntheticPpg {
  const options: SyntheticOptions = typeof seedOrOptions === 'number' ? { seed: seedOrOptions, startMs } : seedOrOptions;
  const shape = options.shape ?? 'dip';
  const frameMs = MS_PER_SECOND / (options.framesPerSecond ?? DEFAULT_FRAMES_PER_SECOND);
  const jitterMs = options.jitterMs ?? DEFAULT_JITTER_MS;
  const repeats = options.repeats ?? 1;
  const random = createRandom(options.seed ?? 1);
  const rr = Array.from({ length: beats }, (_, i) => MACRO_RR[i % MACRO_RR.length] ?? MS_PER_SECOND);
  const beatTimes = rr.reduce<number[]>((times, interval) => [...times, (times.at(-1) ?? MARGIN_MS) + interval], [MARGIN_MS]);
  const endMs = (beatTimes.at(-1) ?? 0) + MARGIN_MS;
  const frames: FrameSample[] = [];
  for (let frame = 0; frame * frameMs < endMs; frame++) {
    const timeMs = frame * frameMs + (random() - 0.5) * jitterMs;
    const noise = NOISE * standardNormal(random);
    if (options.dropEvery !== undefined && frame % options.dropEvery === options.dropEvery - 1) continue;
    const pulse = beatTimes.reduce((sum, beat) => sum + pulseAt(timeMs - beat, shape), 0);
    const drift = DRIFT_AMPLITUDE * Math.sin((2 * Math.PI * timeMs) / DRIFT_PERIOD_MS);
    const slipped = options.slipsAtMs?.some((at) => Math.abs(at - timeMs) < frameMs / 2) ?? false;
    const red = Math.min(CHANNEL_MAX, (options.brightness ?? FINGER_RED) - BEAT_DEPTH * pulse + drift + noise);
    // A uniform synthetic image is either entirely clipped or not at all.
    const sample = slipped ? { red: UNCOVERED_RED, green: UNCOVERED_GREEN, clipped: 0 } : { red, green: FINGER_GREEN, clipped: red >= CHANNEL_MAX ? 1 : 0 };
    for (let copy = 0; copy < repeats; copy++) {
      frames.push({ timeMs: (options.startMs ?? 0) + timeMs + (copy * frameMs) / repeats, ...sample });
    }
  }
  return { frames, rr: rr.slice(1) };
}

/** Frames of an uncovered lens at ~30 fps, from `startMs` for `durationMs`. */
export function uncoveredFrames(startMs: number, durationMs: number): FrameSample[] {
  const frameMs = MS_PER_SECOND / DEFAULT_FRAMES_PER_SECOND;
  return Array.from({ length: Math.ceil(durationMs / frameMs) }, (_, i) => ({
    timeMs: startMs + i * frameMs,
    red: UNCOVERED_RED,
    green: UNCOVERED_GREEN,
  }));
}
