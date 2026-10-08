import type { DiscardReason } from './types';
import {
  DISCARDS_TO_RESET,
  MAX_DEVIATION,
  REFERENCE_BEATS,
  MAX_RR_MS,
  MIN_RR_MS,
} from './thresholds';

export interface Classification {
  readonly accepted: boolean;
  readonly discardReason: DiscardReason | null;
}

const ACCEPTED: Classification = { accepted: true, discardReason: null };

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const center = sorted[middle] ?? 0;
  return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + center) / 2 : center;
}

/**
 * Beat filter (RF-04): separates NN intervals from ectopic beats and
 * artifacts.
 *
 * 1. Discards RR outside the plausible range, without touching the state.
 * 2. Until {@link REFERENCE_BEATS} beats have been accepted, accepts
 *    everything within range.
 * 3. After that, discards RR that deviate more than {@link MAX_DEVIATION}
 *    from the median of the last {@link REFERENCE_BEATS} accepted beats.
 * 4. If {@link DISCARDS_TO_RESET} beats in a row are discarded for deviation,
 *    those beats become the reference: this way a real, sustained change
 *    in heart rate is not discarded forever.
 */
export class BeatFilter {
  #reference: number[] = [];
  #consecutiveDiscards: number[] = [];

  classify(rrMs: number): Classification {
    if (rrMs < MIN_RR_MS || rrMs > MAX_RR_MS) {
      return { accepted: false, discardReason: 'out_of_range' };
    }

    if (this.#reference.length < REFERENCE_BEATS) {
      this.#accept(rrMs);
      return ACCEPTED;
    }

    const reference = median(this.#reference);
    if (Math.abs(rrMs - reference) / reference > MAX_DEVIATION) {
      this.#consecutiveDiscards.push(rrMs);
      if (this.#consecutiveDiscards.length >= DISCARDS_TO_RESET) {
        this.#reference = this.#consecutiveDiscards;
        this.#consecutiveDiscards = [];
      }
      return { accepted: false, discardReason: 'deviation' };
    }

    this.#accept(rrMs);
    return ACCEPTED;
  }

  /** Forgets the reference; used when a new connection starts. */
  reset(): void {
    this.#reference = [];
    this.#consecutiveDiscards = [];
  }

  #accept(rrMs: number): void {
    this.#reference = [...this.#reference, rrMs].slice(-REFERENCE_BEATS);
    this.#consecutiveDiscards = [];
  }
}
