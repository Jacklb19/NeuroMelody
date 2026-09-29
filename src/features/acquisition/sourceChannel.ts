import type {
  ConnectionState,
  BeatNotification,
  SourceObserver,
} from './contract';
import { validateNotification } from './validateNotification';

/** Error emitido por una fuente de señal hacia sus observadores. */
export class SignalSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorFuenteSenal';
  }
}

/**
 * Parte común de toda fuente: observadores, estado de conexión y validación
 * de frontera. Centralizarla garantiza que el simulador y la banda BLE
 * entreguen exactamente las mismas garantías al resto del sistema.
 */
export class SourceChannel {
  readonly #observers = new Set<SourceObserver>();
  #state: ConnectionState = 'disconnected';
  #lastTimeMs = 0;

  get state(): ConnectionState {
    return this.#state;
  }

  subscribe(observer: SourceObserver): () => void {
    this.#observers.add(observer);
    return () => {
      this.#observers.delete(observer);
    };
  }

  changeState(state: ConnectionState): void {
    if (state === this.#state) {
      return;
    }
    this.#state = state;
    for (const observer of this.#observers) {
      observer.onStateChange?.(state);
    }
  }

  /** Reinicia la referencia de tiempo al iniciar una nueva conexión. */
  resetTime(): void {
    this.#lastTimeMs = 0;
  }

  /** Entrega la notificación si es válida; si no, la descarta y avisa del error. */
  notify(notification: BeatNotification): void {
    const result = validateNotification(notification, this.#lastTimeMs);
    if (!result.valid) {
      this.emitError(new SignalSourceError(result.reason));
      return;
    }
    this.#lastTimeMs = notification.timeMs;
    for (const observer of this.#observers) {
      observer.onNotification?.(notification);
    }
  }

  emitError(error: Error): void {
    for (const observer of this.#observers) {
      observer.onError?.(error);
    }
  }
}
