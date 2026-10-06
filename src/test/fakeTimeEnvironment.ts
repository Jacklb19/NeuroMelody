import type {
  Scheduler,
  Clock,
} from '../features/acquisition/simulator/SimulatedSource';
import { CHECK_PERIOD_MS } from '../features/acquisition/simulator/SimulatedSource';

export interface FakeTimeEnvironment {
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  /** Avanza el tiempo real de golpe y dispara una sola revisión. */
  jump(ms: number): void;
  /** Avanza el tiempo real revisión a revisión, como el temporizador real. */
  advance(ms: number): void;
  readonly active: boolean;
  readonly scheduledTasks: number;
}

/** Reloj y programador falsos: el tiempo solo avanza cuando la prueba lo pide. */
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
