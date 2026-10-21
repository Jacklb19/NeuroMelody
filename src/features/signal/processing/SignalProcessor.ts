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
import { HR_ONLY_AFTER_NOTIFICATIONS, type SignalMode } from './signalMode';

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
  /**
   * Whether the connection sends beat intervals or only the pulse (ADR-51).
   * Absent means intervals, as before the mode existed.
   */
  readonly signalMode?: SignalMode;
}

/** A pulse value a watch sent, kept for the pulse-only indices. */
interface PulseReading {
  readonly timeMs: number;
  readonly heartRate: number;
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
  #mode: SignalMode = 'hrv';
  /** Consecutive notifications with contact and pulse but no intervals. */
  #withoutIntervals = 0;
  /** Last notification with contact: in pulse-only mode it is what a gap is measured from. */
  #lastPulseMs = 0;
  #pulses: PulseReading[] = [];

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
    this.#observeMode(notification);

    const lastSignalMs = this.#mode === 'hr_only' ? this.#lastPulseMs : this.#lastRrMs;
    if (timeMs - lastSignalMs > MAX_GAP_MS) {
      this.#slidingWindow.addSegment({ startMs: lastSignalMs, endMs: timeMs });
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
    } else {
      this.#lastPulseMs = timeMs;
      this.#pulses.push({ timeMs, heartRate: notification.heartRate });
      if (notification.rrIntervalsMs.length > 0) {
        this.#addBeats(notification, (rr) => this.#filter.classify(rr));
        this.#lastRrMs = timeMs;
      }
    }

    if (isAcceptanceLow(this.#slidingWindow.beats, timeMs)) {
      this.#slidingWindow.addSegment({ startMs: previousMs, endMs: timeMs });
      low = true;
    }

    this.#lowNow = low;
    this.#lastTimeMs = timeMs;
    this.#slidingWindow.prune(timeMs);
    while ((this.#pulses[0]?.timeMs ?? timeMs) < timeMs - ANALYSIS_WINDOW_MS) this.#pulses.shift();

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
    this.#mode = 'hrv';
    this.#withoutIntervals = 0;
    this.#lastPulseMs = 0;
    this.#pulses = [];
  }

  /** Any interval makes the connection one of intervals; a run of pulse-only notifications, pulse only. */
  #observeMode(notification: BeatNotification): void {
    if (notification.rrIntervalsMs.length > 0) {
      this.#mode = 'hrv';
      this.#withoutIntervals = 0;
      return;
    }
    if (notification.sensorContact === false) return;
    this.#withoutIntervals++;
    if (this.#withoutIntervals >= HR_ONLY_AFTER_NOTIFICATIONS) this.#mode = 'hr_only';
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
    return this.#mode === 'hr_only' ? this.#computePulseOnly(timeMs) : this.#computeIntervals(timeMs);
  }

  /**
   * With only the pulse, the mean comes from the values the watch sent in the
   * window; the variability indices stay empty. Signal time counts the
   * stretches between pulses no longer apart than a gap.
   */
  #computePulseOnly(timeMs: number): IndicesResult {
    let durationMs = 0;
    for (let i = 1; i < this.#pulses.length; i++) {
      const step = (this.#pulses[i]?.timeMs ?? 0) - (this.#pulses[i - 1]?.timeMs ?? 0);
      if (step <= MAX_GAP_MS) durationMs += step;
    }
    const enough = durationMs >= MIN_NN_FOR_INDICES_MS;
    const meanHr = this.#pulses.reduce((sum, pulse) => sum + pulse.heartRate, 0) / Math.max(1, this.#pulses.length);
    return {
      timeMs,
      meanHr: enough ? meanHr : null,
      rmssd: null,
      sdnn: null,
      nnDurationMs: durationMs,
      coverageMs: Math.min(timeMs, ANALYSIS_WINDOW_MS),
      acceptedBeats: 0,
      discardedBeats: 0,
      quality: this.#lowNow ? 'low' : enough ? 'good' : 'collecting',
      lfPower: null,
      hfPower: null,
      lfHfRatio: null,
      signalMode: 'hr_only',
    };
  }

  #computeIntervals(timeMs: number): IndicesResult {
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
      signalMode: 'hrv',
    };
  }
}
