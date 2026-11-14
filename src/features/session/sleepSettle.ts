import type { SessionSnapshot } from '../adaptation/AdaptationSession';
import type { LevelId } from '../audio/engine/levels';
import { SECONDS_PER_MINUTE } from '../../shared/time';

/**
 * Listening time, without a break, that the pulse must stay settled before a
 * session for falling asleep starts its ending (ADR-60).
 */
export const SETTLED_FOR_S = 5 * SECONDS_PER_MINUTE;

/**
 * Whether a reading counts as settled: the estimate says the pulse is lower
 * than when the session started, the signal is good and the music has
 * already come down to the calmest step of the program. Descriptive only:
 * it says nothing about being asleep.
 */
export function isSettled(snapshot: Pick<SessionSnapshot, 'state' | 'qualityGood' | 'level'>, calmestLevel: LevelId): boolean {
  return snapshot.state === 'low' && snapshot.qualityGood && snapshot.level === calmestLevel;
}

/**
 * Follows the readings of one session and says, once, when the pulse has
 * stayed settled for `SETTLED_FOR_S` of listening. Any reading that is not
 * settled starts the count again, and so does a pause.
 */
export class SettleWatch {
  readonly #requiredS: number;
  #settledSinceS: number | null = null;
  #reported = false;

  constructor(requiredS: number = SETTLED_FOR_S) {
    this.#requiredS = requiredS;
  }

  /**
   * Takes one reading at `listenedS` seconds of listening.
   *
   * @returns `true` the first time the pulse has been settled for long enough, `false` otherwise.
   */
  observe(listenedS: number, settled: boolean): boolean {
    if (!settled) {
      this.#settledSinceS = null;
      return false;
    }
    this.#settledSinceS ??= listenedS;
    if (this.#reported || listenedS - this.#settledSinceS < this.#requiredS) return false;
    this.#reported = true;
    return true;
  }

  /** The music paused: the time before the pause no longer counts as continuous. */
  interrupt(): void {
    this.#settledSinceS = null;
  }

  /** A new session starts: it may end early once, like the one before. */
  reset(): void {
    this.#settledSinceS = null;
    this.#reported = false;
  }
}
