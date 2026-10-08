import { addSegment } from './signalQuality';
import type { ClassifiedBeat, LowQualitySegment } from './types';
import { ANALYSIS_WINDOW_MS } from './thresholds';

/**
 * Last {@link ANALYSIS_WINDOW_MS} of signal time: classified beats and
 * low-quality segments. Measured in signal time, not wall-clock time, so the
 * analysis is the same at any simulator speed.
 */
export class SlidingWindow {
  #beats: ClassifiedBeat[] = [];
  #segments: LowQualitySegment[] = [];

  get beats(): readonly ClassifiedBeat[] {
    return this.#beats;
  }

  get segments(): readonly LowQualitySegment[] {
    return this.#segments;
  }

  addBeat(beat: ClassifiedBeat): void {
    this.#beats.push(beat);
  }

  addSegment(segment: LowQualitySegment): void {
    this.#segments = addSegment(this.#segments, segment);
  }

  /** Drops whatever fell outside the window ending at `currentTimeMs`. */
  prune(currentTimeMs: number): void {
    const limitMs = currentTimeMs - ANALYSIS_WINDOW_MS;
    const first = this.#beats.findIndex((beat) => beat.endMs > limitMs);
    this.#beats = first === -1 ? [] : this.#beats.slice(first);
    this.#segments = this.#segments.filter((segment) => segment.endMs > limitMs);
  }

  clear(): void {
    this.#beats = [];
    this.#segments = [];
  }
}
