import { createRandom, type RandomSource } from '../acquisition/simulator/prng';
import { computeTimeDomainIndices } from '../signal/processing/timeDomainIndices';
import { HERO_HEART, SIMULATOR_HISTORY_BEATS } from './config';

export type HeartOptions = typeof HERO_HEART;

/** What the sample readout shows; never real data. */
export interface HeartReading {
  readonly heartRate: number | null;
  readonly rmssd: number | null;
  readonly lastRrMs: number | null;
}

/**
 * A small, reproducible heart for the landing page: beats whose intervals
 * follow breathing plus a little noise. The 3D scene reads the phase of the
 * current beat; the readout reads the recent intervals. Time is the page
 * clock in ms, so both stay in step without timers of their own.
 */
export class HeartbeatSimulator {
  readonly #options: HeartOptions;
  readonly #random: RandomSource;
  /** Start of each kept beat and its interval, oldest first. */
  readonly #starts: number[] = [0];
  readonly #intervals: number[] = [];

  constructor(options: HeartOptions = HERO_HEART) {
    this.#options = options;
    this.#random = createRandom(options.seed);
    this.#intervals.push(this.#nextInterval(0));
  }

  /** Where `timeMs` falls inside its beat: 0 at the beat, approaching 1 just before the next. */
  phaseAt(timeMs: number): number {
    this.#advanceTo(timeMs);
    const index = this.#starts.length - 1;
    const start = this.#starts[index] ?? 0;
    const interval = this.#intervals[index] ?? this.#options.meanRrMs;
    return Math.min(Math.max((timeMs - start) / interval, 0), 1);
  }

  /** Figures over the last `beats` completed intervals up to `timeMs`. */
  readingAt(timeMs: number, beats: number): HeartReading {
    this.#advanceTo(timeMs);
    // The last interval is still running, so it is left out.
    const kept = this.#intervals.length - 1;
    const first = Math.max(0, kept - beats);
    const completed = this.#intervals.slice(first, kept);
    const indices = computeTimeDomainIndices(
      completed.map((rrMs, i) => ({
        rrMs,
        endMs: (this.#starts[first + i] ?? 0) + rrMs,
        accepted: true,
        discardReason: null,
        contiguousWithPrevious: true,
      })),
    );
    return { heartRate: indices.meanHr, rmssd: indices.rmssd, lastRrMs: completed.at(-1) ?? null };
  }

  #advanceTo(timeMs: number): void {
    let last = this.#starts.length - 1;
    while ((this.#starts[last] ?? 0) + (this.#intervals[last] ?? 0) <= timeMs) {
      const start = (this.#starts[last] ?? 0) + (this.#intervals[last] ?? 0);
      this.#starts.push(start);
      this.#intervals.push(this.#nextInterval(start));
      if (this.#starts.length > SIMULATOR_HISTORY_BEATS) {
        this.#starts.shift();
        this.#intervals.shift();
      }
      last = this.#starts.length - 1;
    }
  }

  #nextInterval(startMs: number): number {
    const { meanRrMs, breathingDepthMs, breathingPeriodMs, jitterMs } = this.#options;
    const breathing = Math.sin((2 * Math.PI * startMs) / breathingPeriodMs) * breathingDepthMs;
    return meanRrMs + breathing + (this.#random() - 0.5) * 2 * jitterMs;
  }
}
