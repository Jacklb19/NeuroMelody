/**
 * Time adapters shared by every source. They are injectable so tests can
 * drive time deterministically; none of them drives musical timing.
 */

/** Real time source in ms. */
export interface Clock {
  nowMs(): number;
}

/** Runs a periodic task and returns the function that cancels it. */
export interface Scheduler {
  repeat(task: () => void, periodMs: number): () => void;
}

export const browserClock: Clock = {
  nowMs: () => performance.now(),
};

export const browserScheduler: Scheduler = {
  repeat: (task, periodMs) => {
    const id = setInterval(task, periodMs);
    return () => {
      clearInterval(id);
    };
  },
};
