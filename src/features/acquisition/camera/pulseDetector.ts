import { MAX_RR_MS, MIN_RR_MS } from '../../signal/processing/thresholds';
import {
  AMPLITUDE_WINDOW_MS,
  BASELINE_WINDOW_MS,
  CONTACT_GRACE_MS,
  MIN_FINGER_RED,
  MIN_RED_TO_GREEN,
  PEAK_HALF_WIDTH,
  PEAK_THRESHOLD,
  SATURATED_SHARE,
  SATURATION_WINDOW_MS,
  SMOOTHING_FRAMES,
} from './config';

/** Mean colour of one camera frame over the covered lens, 0–255 per channel. */
export interface FrameSample {
  readonly timeMs: number;
  readonly red: number;
  readonly green: number;
  /** Share of pixels whose red is at the channel maximum, 0–1; unknown when absent. */
  readonly clipped?: number;
}

interface Point {
  readonly timeMs: number;
  readonly value: number;
}

/** Keeps only the points newer than `windowMs` before `nowMs`. */
function trim(points: Point[], nowMs: number, windowMs: number): void {
  while (points.length > 0 && (points[0]?.timeMs ?? nowMs) < nowMs - windowMs) points.shift();
}

function meanOf(points: readonly Point[]): number {
  return points.reduce((sum, point) => sum + point.value, 0) / points.length;
}

/**
 * Vertex time of the least-squares parabola through `points`, measured from
 * `originMs`. Real timestamps are used because frames are not evenly spaced.
 * Returns `null` when the points do not curve downwards.
 */
function parabolaVertex(points: readonly Point[], originMs: number): number | null {
  // Normal equations of y = a + b·x + c·x², solved with Cramer's rule.
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, y0 = 0, y1 = 0, y2 = 0;
  for (const point of points) {
    const x = point.timeMs - originMs;
    s0 += 1; s1 += x; s2 += x * x; s3 += x ** 3; s4 += x ** 4;
    y0 += point.value; y1 += x * point.value; y2 += x * x * point.value;
  }
  const det = (m: readonly number[]): number =>
    (m[0] ?? 0) * ((m[4] ?? 0) * (m[8] ?? 0) - (m[5] ?? 0) * (m[7] ?? 0))
    - (m[1] ?? 0) * ((m[3] ?? 0) * (m[8] ?? 0) - (m[5] ?? 0) * (m[6] ?? 0))
    + (m[2] ?? 0) * ((m[3] ?? 0) * (m[7] ?? 0) - (m[4] ?? 0) * (m[6] ?? 0));
  const d = det([s0, s1, s2, s1, s2, s3, s2, s3, s4]);
  if (d === 0) return null;
  const b = det([s0, y0, s2, s1, y1, s3, s2, y2, s4]) / d;
  const c = det([s0, s1, y0, s1, s2, y1, s2, s3, y2]) / d;
  return c < 0 ? -b / (2 * c) : null;
}

/**
 * Finds heartbeats in the brightness of a fingertip over the camera
 * (photoplethysmography) and turns them into RR intervals.
 *
 * Each beat pushes more blood into the fingertip, which absorbs light, so
 * the image darkens: the pulse is a dip in the red channel. The detector
 * removes the slow baseline, inverts and smooths the signal, and takes local
 * maxima above a share of the recent amplitude, at least MIN_RR_MS apart.
 * Frames arrive every ~33 ms, so each peak is refined with a least-squares
 * parabola over its neighbours and their real timestamps; without that, RR
 * would be quantised to the frame and shaken by frame-time jitter.
 *
 * Frames without a finger for up to CONTACT_GRACE_MS are skipped rather than
 * restarting the detector, and the share of clipped pixels tells when the
 * image is too bright to hold the pulse (measured on synthetic recordings,
 * docs/decisiones.md ADR-50).
 */
export class PulseDetector {
  readonly #raw: Point[] = [];
  readonly #detrended: Point[] = [];
  readonly #smoothed: Point[] = [];
  #lastPeakMs: number | null = null;
  /** First frame of the current contact; peaks wait until the baseline is full. */
  #contactStartMs: number | null = null;
  #fingerDetected = false;
  /** When the current run of frames without a finger began; `null` while the finger is on the lens. */
  #lostSinceMs: number | null = null;
  readonly #clipped: Point[] = [];

  get fingerDetected(): boolean {
    return this.#fingerDetected;
  }

  /** Whether most of the image has been at the channel maximum lately, so beats can be lost in it. */
  get saturated(): boolean {
    return this.#clipped.length > 0 && meanOf(this.#clipped) >= SATURATED_SHARE;
  }

  /** Recent smoothed signal, oldest first, for drawing the waveform. */
  get waveform(): readonly Point[] {
    return this.#smoothed;
  }

  /** Adds a frame and returns the beat intervals it completes, in ms. */
  push(sample: FrameSample): number[] {
    const finger = sample.red >= MIN_FINGER_RED && sample.red >= MIN_RED_TO_GREEN * sample.green;
    const { timeMs } = sample;
    if (!finger) {
      // A brief slip only skips its frames; a longer one starts over.
      this.#lostSinceMs ??= timeMs;
      if (this.#fingerDetected && timeMs - this.#lostSinceMs > CONTACT_GRACE_MS) this.reset();
      return [];
    }
    this.#lostSinceMs = null;
    this.#fingerDetected = true;
    if (sample.clipped !== undefined) {
      this.#clipped.push({ timeMs, value: sample.clipped });
      trim(this.#clipped, timeMs, SATURATION_WINDOW_MS);
    }
    this.#contactStartMs ??= timeMs;

    this.#raw.push({ timeMs, value: sample.red });
    trim(this.#raw, timeMs, BASELINE_WINDOW_MS);
    this.#detrended.push({ timeMs, value: meanOf(this.#raw) - sample.red });
    if (this.#detrended.length > SMOOTHING_FRAMES) this.#detrended.shift();
    // The average belongs to the mean time of its frames, so its delay does not vary with frame jitter.
    const smoothedMs = this.#detrended.reduce((sum, point) => sum + point.timeMs, 0) / this.#detrended.length;
    this.#smoothed.push({ timeMs: smoothedMs, value: meanOf(this.#detrended) });
    trim(this.#smoothed, timeMs, AMPLITUDE_WINDOW_MS);

    const peakMs = this.#peakBeforeLast();
    if (peakMs === null) return [];
    const previous = this.#lastPeakMs;
    this.#lastPeakMs = peakMs;
    if (previous === null) return [];
    const rr = peakMs - previous;
    return rr >= MIN_RR_MS && rr <= MAX_RR_MS ? [rr] : [];
  }

  /** Forgets the signal, as when the finger leaves the lens. */
  reset(): void {
    this.#raw.length = 0;
    this.#detrended.length = 0;
    this.#smoothed.length = 0;
    this.#lastPeakMs = null;
    this.#contactStartMs = null;
    this.#fingerDetected = false;
    this.#clipped.length = 0;
  }

  /** Time of a confirmed peak two frames back, refined to sub-frame precision. */
  #peakBeforeLast(): number | null {
    const window = this.#smoothed.slice(-(2 * PEAK_HALF_WIDTH + 1));
    const candidate = window[PEAK_HALF_WIDTH];
    if (candidate === undefined || window.length < 2 * PEAK_HALF_WIDTH + 1) return null;
    if (this.#contactStartMs === null || candidate.timeMs - this.#contactStartMs < BASELINE_WINDOW_MS) return null;
    const isMaximum = window.every((point, i) =>
      i === PEAK_HALF_WIDTH || (i < PEAK_HALF_WIDTH ? point.value < candidate.value : point.value <= candidate.value));
    if (!isMaximum) return null;
    const amplitude = Math.max(...this.#smoothed.map((point) => Math.abs(point.value)));
    if (candidate.value < PEAK_THRESHOLD * amplitude) return null;
    if (this.#lastPeakMs !== null && candidate.timeMs - this.#lastPeakMs < MIN_RR_MS) return null;

    const offset = parabolaVertex(window, candidate.timeMs);
    const halfSpanMs = ((window.at(-1)?.timeMs ?? candidate.timeMs) - (window[0]?.timeMs ?? candidate.timeMs)) / 2;
    // A vertex outside the fitted span means a skewed peak; keep the sample time.
    return offset !== null && Math.abs(offset) <= halfSpanMs ? candidate.timeMs + offset : candidate.timeMs;
  }
}
