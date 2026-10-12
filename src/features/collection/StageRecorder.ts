import type { BeatNotification } from '../acquisition/contract';
import { MS_PER_SECOND } from '../../shared/time';
import type { CollectionStageId } from './collectionProtocol';
import type { CollectionSegment } from './collectionRecording';

/** Decimals kept of every time and interval: a tenth of a millisecond is finer than any source measures. */
const STORED_DECIMALS = 1;
const round = (value: number): number => Number(value.toFixed(STORED_DECIMALS));

/**
 * What happened with a notification: the stage goes on, it has recorded all
 * its time, or the signal started over (the source reconnected), so what
 * was recorded no longer forms one stretch and the stage must be repeated.
 */
export type StageStatus = 'recording' | 'complete' | 'interrupted';

/**
 * Records the heartbeats of one stage of the protocol. It counts signal
 * time, not wall-clock time, like the analysis does: the stage starts with
 * the first notification it receives and ends once the signal has advanced
 * its whole duration, so time without signal is not counted as recorded.
 */
export class StageRecorder {
  readonly #label: CollectionStageId;
  readonly #durationMs: number;
  readonly #beatTimesMs: number[] = [];
  readonly #rrMs: number[] = [];
  #originMs: number | null = null;
  #lastTimeMs = 0;

  constructor(label: CollectionStageId, plannedSeconds: number) {
    this.#label = label;
    this.#durationMs = plannedSeconds * MS_PER_SECOND;
  }

  /** Milliseconds of signal recorded so far, capped at the duration of the stage. */
  get elapsedMs(): number {
    return this.#originMs === null ? 0 : Math.min(this.#durationMs, this.#lastTimeMs - this.#originMs);
  }

  get durationMs(): number {
    return this.#durationMs;
  }

  get beats(): number {
    return this.#rrMs.length;
  }

  add(notification: BeatNotification): StageStatus {
    if (this.#originMs === null) {
      // The intervals of this first notification ended before the stage began.
      this.#originMs = notification.timeMs;
      this.#lastTimeMs = notification.timeMs;
      return 'recording';
    }
    if (notification.timeMs < this.#lastTimeMs) return 'interrupted';
    this.#lastTimeMs = notification.timeMs;

    // The notification only says its beats ended before it: the last one is placed at its
    // instant and the earlier ones backwards from there, as the signal processor does.
    const intervals = notification.rrIntervalsMs;
    let endMs = notification.timeMs - this.#originMs - intervals.reduce((sum, value) => sum + value, 0);
    for (const rrMs of intervals) {
      const startMs = endMs;
      endMs += rrMs;
      // Only whole intervals inside the stage: one that began before it mixes two stretches.
      if (rrMs > 0 && startMs >= 0 && endMs <= this.#durationMs) {
        this.#beatTimesMs.push(round(endMs));
        this.#rrMs.push(round(rrMs));
      }
    }
    return notification.timeMs - this.#originMs >= this.#durationMs ? 'complete' : 'recording';
  }

  /** The stage as it is stored. */
  segment(): CollectionSegment {
    return {
      label: this.#label,
      plannedSeconds: this.#durationMs / MS_PER_SECOND,
      beatTimesMs: [...this.#beatTimesMs],
      rrMs: [...this.#rrMs],
    };
  }
}
