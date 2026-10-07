import type { BeatNotification } from '../../acquisition/contract';
import { isAcceptanceLow } from './signalQuality';
import { BeatFilter } from './BeatFilter';
import { computeTimeDomainIndices } from './timeDomainIndices';
import { computeFrequencyIndices } from './frequencyDomain';
import type { ClassifiedBeat, LowQualitySegment, SignalQuality } from './types';
import {
  MAX_GAP_MS,
  MIN_NN_FOR_INDICES_MS,
  COMPUTE_PERIOD_MS,
  ANALYSIS_WINDOW_MS,
} from './thresholds';
import { SlidingWindow } from './SlidingWindow';

/** Result published every {@link COMPUTE_PERIOD_MS} of signal (RF-05). */
export interface IndicesResult {
  readonly timeMs: number;
  /** The indices are `null` until the window holds {@link MIN_NN_FOR_INDICES_MS} of valid NN. */
  readonly meanHr: number | null;
  readonly rmssd: number | null;
  readonly sdnn: number | null;
  readonly nnDurationMs: number;
  /** Portion of the {@link ANALYSIS_WINDOW_MS} window already covered by the signal. */
  readonly coverageMs: number;
  readonly acceptedBeats: number;
  readonly discardedBeats: number;
  readonly quality: SignalQuality;
  /** Frequency-domain indices (RF-06); `null` until `MIN_SPECTRUM_MS` of continuous signal. */
  readonly lfPower: number | null;
  readonly hfPower: number | null;
  readonly lfHfRatio: number | null;
}

/** Window contents, for drawing. */
export interface WindowSnapshot {
  readonly timeMs: number;
  readonly beats: readonly ClassifiedBeat[];
  readonly segments: readonly LowQualitySegment[];
}

/**
 * Full processing of the signal thread, with no Worker dependencies so it can
 * be tested deterministically.
 *
 * For each notification: classifies the RR (RF-04), marks gaps, contact
 * losses and stretches with low acceptance, and maintains the analysis window.
 * Every time the signal time crosses a multiple of {@link COMPUTE_PERIOD_MS}
 * it publishes the indices (RF-05). The cadence depends on signal time
 * rather than timers, so it is the same at any speed.
 */
export class SignalProcessor {
  readonly #onIndices: (result: IndicesResult) => void;
  readonly #filter = new BeatFilter();
  readonly #slidingWindow = new SlidingWindow();
  #lastTimeMs = 0;
  #lastRrMs = 0;
  #nextComputeMs = COMPUTE_PERIOD_MS;
  /** There was a gap or contact loss since the last beat. */
  #continuityBroken = false;
  #lowNow = false;

  constructor(onIndices: (result: IndicesResult) => void) {
    this.#onIndices = onIndices;
  }

  get snapshot(): WindowSnapshot {
    return {
      timeMs: this.#lastTimeMs,
      beats: this.#slidingWindow.beats,
      segments: this.#slidingWindow.segments,
    };
  }

  process(notification: BeatNotification): void {
    const { timeMs } = notification;
    const previousMs = this.#lastTimeMs;
    let low = false;

    if (timeMs - this.#lastRrMs > MAX_GAP_MS) {
      this.#slidingWindow.addSegment({ startMs: this.#lastRrMs, endMs: timeMs });
      this.#continuityBroken = true;
      low = true;
    }

    if (notification.sensorContact === false) {
      this.#slidingWindow.addSegment({ startMs: previousMs, endMs: timeMs });
      this.#continuityBroken = true;
      low = true;
      this.#addBeats(notification, () => ({
        accepted: false,
        discardReason: 'no_contact',
      }));
    } else if (notification.rrIntervalsMs.length > 0) {
      this.#addBeats(notification, (rr) => this.#filter.classify(rr));
      this.#lastRrMs = timeMs;
    }

    if (isAcceptanceLow(this.#slidingWindow.beats, timeMs)) {
      this.#slidingWindow.addSegment({ startMs: previousMs, endMs: timeMs });
      low = true;
    }

    this.#lowNow = low;
    this.#lastTimeMs = timeMs;
    this.#slidingWindow.prune(timeMs);

    if (timeMs >= this.#nextComputeMs) {
      this.#onIndices(this.#compute(timeMs));
      while (this.#nextComputeMs <= timeMs) {
        this.#nextComputeMs += COMPUTE_PERIOD_MS;
      }
    }
  }

  /** Returns to the initial state; used when a new connection starts. */
  reset(): void {
    this.#filter.reset();
    this.#slidingWindow.clear();
    this.#lastTimeMs = 0;
    this.#lastRrMs = 0;
    this.#nextComputeMs = COMPUTE_PERIOD_MS;
    this.#continuityBroken = false;
    this.#lowNow = false;
  }

  /**
   * The notification does not say when each beat ended, only that they ended
   * before it: the last one is assumed to end at the notification instant and
   * the earlier ones are placed backwards from there (error < 1 s).
   */
  #addBeats(
    notification: BeatNotification,
    classify: (rrMs: number) => Pick<ClassifiedBeat, 'accepted' | 'discardReason'>,
  ): void {
    const rr = notification.rrIntervalsMs;
    let endMs = notification.timeMs - rr.reduce((sum, value) => sum + value, 0);
    for (const rrMs of rr) {
      endMs += rrMs;
      this.#slidingWindow.addBeat({
        endMs,
        rrMs,
        ...classify(rrMs),
        contiguousWithPrevious: !this.#continuityBroken,
      });
      this.#continuityBroken = false;
    }
  }

  #compute(timeMs: number): IndicesResult {
    const beats = this.#slidingWindow.beats;
    const indices = computeTimeDomainIndices(beats);
    const spectrum = computeFrequencyIndices(beats);
    const enough = indices.nnDurationMs >= MIN_NN_FOR_INDICES_MS;
    let quality: SignalQuality = enough ? 'good' : 'collecting';
    if (this.#lowNow) {
      quality = 'low';
    }
    return {
      timeMs,
      meanHr: enough ? indices.meanHr : null,
      rmssd: enough ? indices.rmssd : null,
      sdnn: enough ? indices.sdnn : null,
      nnDurationMs: indices.nnDurationMs,
      coverageMs: Math.min(timeMs, ANALYSIS_WINDOW_MS),
      acceptedBeats: indices.validNn,
      discardedBeats: beats.length - indices.validNn,
      quality,
      lfPower: spectrum?.lfPower ?? null,
      hfPower: spectrum?.hfPower ?? null,
      lfHfRatio: spectrum?.lfHfRatio ?? null,
    };
  }
}
