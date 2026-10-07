import type { Clock, Scheduler } from '../features/acquisition/timing';
import { CHECK_PERIOD_MS } from '../features/acquisition/config';

export interface FakeTimeEnvironment {
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  /** Advances wall-clock time in one jump and fires a single check. */
  jump(ms: number): void;
  /** Advances wall-clock time check by check, like the real timer. */
  advance(ms: number): void;
  readonly active: boolean;
  readonly scheduledTasks: number;
}

/** Fake clock and scheduler: time only advances when the test asks for it. */
export function createFakeTimeEnvironment(): FakeTimeEnvironment {
  let now = 5000;
  let task: (() => void) | null = null;
  let scheduledTasks = 0;

  const jump = (ms: number): void => {
    now += ms;
    task?.();
  };

  return {
    clock: { nowMs: () => now },
    scheduler: {
      repeat: (newTask) => {
        task = newTask;
        scheduledTasks++;
        return () => {
          task = null;
        };
      },
    },
    jump,
    advance(ms) {
      for (let t = 0; t < ms; t += CHECK_PERIOD_MS) {
        jump(CHECK_PERIOD_MS);
      }
    },
    get active() {
      return task !== null;
    },
    get scheduledTasks() {
      return scheduledTasks;
    },
  };
}
