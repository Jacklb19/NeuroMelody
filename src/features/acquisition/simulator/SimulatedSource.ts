import { SourceChannel } from '../../acquisition/sourceChannel';
import type {
  ConnectionState,
  SignalSource,
  BeatNotification,
  SourceObserver,
} from '../../acquisition/contract';
import { SCENARIOS, type ScenarioId } from './scenarios';
import { createRrGenerator, type RrGenerator, type Beat } from './rrGenerator';

/** Factores de aceleración del tiempo de señal permitidos (RF-02). */
export type Speed = 1 | 2 | 5 | 10;
export const SPEEDS: readonly Speed[] = [1, 2, 5, 10];

/** Fuente de tiempo real en ms; inyectable para pruebas deterministas. */
export interface Clock {
  nowMs(): number;
}

/** Ejecuta una tarea periódica y devuelve la función que la cancela. */
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

/** Periodo de las notificaciones en tiempo de señal, como una banda BLE. */
export const NOTIFICATION_PERIOD_MS = 1000;
/** Periodo real con que se revisa si hay notificaciones pendientes. */
export const CHECK_PERIOD_MS = 100;
/** Latidos recientes promediados para reportar la frecuencia cardíaca. */
const BEATS_FOR_HR = 4;

/**
 * Fuente de señal simulada (RF-02) que cumple el mismo contrato que la banda BLE.
 *
 * La serie depende solo del escenario, la semilla y el tiempo de señal, nunca
 * de cuándo dispara el temporizador: en cada revisión se emiten todas las
 * notificaciones pendientes hasta el tiempo actual. Así, si el navegador
 * retrasa los temporizadores (pestaña en segundo plano), no se pierden datos
 * y la serie no cambia; solo llegan más tarde.
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
    // Se comprueba la conexión en cada vuelta: un observador puede desconectar
    // la fuente mientras recibe una notificación.
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
      // Como una banda real: sigue notificando, sin RR y con la última FC.
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
    // Antes del primer latido completo se usa el que está en curso.
    const reference = this.#recentRr.length > 0 ? this.#recentRr : [pending.rrMs];
    const meanRr = reference.reduce((sum, rr) => sum + rr, 0) / reference.length;
    return Math.round(60000 / meanRr);
  }

  /** Pérdida de contacto periódica del escenario de artefactos: (k·periodo, k·periodo + duración]. */
  #noContact(timeMs: number): boolean {
    const artifacts = SCENARIOS[this.#options.scenario].artifacts;
    if (artifacts === null || timeMs < artifacts.contactLossPeriodMs) {
      return false;
    }
    const phase = timeMs % artifacts.contactLossPeriodMs;
    return phase > 0 && phase <= artifacts.contactLossDurationMs;
  }
}
