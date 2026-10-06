import { SourceChannel } from '../../acquisition/sourceChannel';
import type {
  ConnectionState,
  SignalSource,
  BeatNotification,
  SourceObserver,
} from '../../acquisition/contract';
import { SCENARIOS, type ScenarioId } from './scenarios';
import { createRrGenerator, type RrGenerator, type Beat } from './rrGenerator';

/** Allowed signal time speed-up factors (RF-02). */
export type Speed = 1 | 2 | 5 | 10;
export const SPEEDS: readonly Speed[] = [1, 2, 5, 10];

/** Real time source in ms; injectable for deterministic tests. */
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

export interface SimulatedSourceOptions {
  readonly scenario: ScenarioId;
  readonly seed: number;
  readonly speed: Speed;
  readonly clock?: Clock;
  readonly scheduler?: Scheduler;
}

/** Notification period in signal time, like a BLE strap. */
export const NOTIFICATION_PERIOD_MS = 1000;
/** Real period at which pending notifications are checked. */
export const CHECK_PERIOD_MS = 100;
/** Recent beats averaged to report the heart rate. */
const BEATS_FOR_HR = 4;

/**
 * Simulated signal source (RF-02) that fulfils the same contract as the BLE strap.
 *
 * The series depends only on the scenario, the seed and signal time, never on
 * when the timer fires: every check emits all notifications pending up to
 * the current time. So if the browser delays timers (background tab), no
 * data is lost and the series does not change; it just arrives later.
 *
 */
export class SimulatedSource implements SignalSource {
  readonly kind = 'simulator' as const;

  readonly #channel = new SourceChannel();
  readonly #options: SimulatedSourceOptions;
  readonly #clock: Clock;
  readonly #scheduler: Scheduler;

  #cancelCheck: (() => void) | null = null;
  #realStartMs = 0;
  #generator: RrGenerator | null = null;
  #pendingBeat: Beat | null = null;
  #nextNotificationMs = NOTIFICATION_PERIOD_MS;
  #recentRr: number[] = [];

  constructor(options: SimulatedSourceOptions) {
    this.#options = options;
    this.#clock = options.clock ?? browserClock;
    this.#scheduler = options.scheduler ?? browserScheduler;
  }

  get state(): ConnectionState {
    return this.#channel.state;
  }

  subscribe(observer: SourceObserver): () => void {
    return this.#channel.subscribe(observer);
  }

  connect(): Promise<void> {
    if (this.#cancelCheck !== null) {
      return Promise.resolve();
    }
    this.#channel.changeState('connecting');
    this.#channel.resetTime();
    this.#generator = createRrGenerator(
      SCENARIOS[this.#options.scenario],
      this.#options.seed,
    );
    this.#pendingBeat = this.#generator.next();
    this.#nextNotificationMs = NOTIFICATION_PERIOD_MS;
    this.#recentRr = [];
    this.#realStartMs = this.#clock.nowMs();
    this.#cancelCheck = this.#scheduler.repeat(() => {
      this.#emitPending();
    }, CHECK_PERIOD_MS);
    this.#channel.changeState('connected');
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    this.#cancelCheck?.();
    this.#cancelCheck = null;
    this.#generator = null;
    this.#pendingBeat = null;
    this.#channel.changeState('disconnected');
    return Promise.resolve();
  }

  #emitPending(): void {
    const signalTimeMs =
      (this.#clock.nowMs() - this.#realStartMs) * this.#options.speed;
    // The connection is checked on every pass: an observer may disconnect
    // the source while it receives a notification.
    while (
      this.#cancelCheck !== null &&
      this.#nextNotificationMs <= signalTimeMs
    ) {
      this.#channel.notify(this.#buildNotification(this.#nextNotificationMs));
      this.#nextNotificationMs += NOTIFICATION_PERIOD_MS;
    }
  }

  #buildNotification(timeMs: number): BeatNotification {
    const generator = this.#generator;
    let pending = this.#pendingBeat;
    if (generator === null || pending === null) {
      throw new Error('La fuente simulada no está conectada.');
    }

    const rrIntervalsMs: number[] = [];
    while (pending.endMs <= timeMs) {
      rrIntervalsMs.push(pending.rrMs);
      pending = generator.next();
    }
    this.#pendingBeat = pending;

    if (this.#noContact(timeMs)) {
      // Like a real strap: keeps notifying, with no RR and the last heart rate.
      return {
        timeMs,
        heartRate: this.#heartRate(pending),
        rrIntervalsMs: [],
        sensorContact: false,
      };
    }

    this.#recentRr = [...this.#recentRr, ...rrIntervalsMs].slice(-BEATS_FOR_HR);
    return {
      timeMs,
      heartRate: this.#heartRate(pending),
      rrIntervalsMs,
      sensorContact: true,
    };
  }

  #heartRate(pending: Beat): number {
    // Before the first complete beat, the one in progress is used.
    const reference = this.#recentRr.length > 0 ? this.#recentRr : [pending.rrMs];
    const meanRr = reference.reduce((sum, rr) => sum + rr, 0) / reference.length;
    return Math.round(60000 / meanRr);
  }

  /** Periodic contact loss of the artifacts scenario: (k·period, k·period + duration]. */
  #noContact(timeMs: number): boolean {
    const artifacts = SCENARIOS[this.#options.scenario].artifacts;
    if (artifacts === null || timeMs < artifacts.contactLossPeriodMs) {
      return false;
    }
    const phase = timeMs % artifacts.contactLossPeriodMs;
    return phase > 0 && phase <= artifacts.contactLossDurationMs;
  }
}
