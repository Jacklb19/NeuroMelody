import type {
  ConnectionState,
  BeatNotification,
  SourceObserver,
} from './contract';
import { validateNotification, type NotificationIssue } from './validateNotification';

/**
 * A notification was discarded at the layer boundary. `code` says why; the
 * interface turns it into text, so the message is for developers only.
 */
export class SignalSourceError extends Error {
  readonly code: NotificationIssue;

  constructor(code: NotificationIssue) {
    super(`Notification discarded at the acquisition boundary: ${code}`);
    this.name = 'SignalSourceError';
    this.code = code;
  }
}

/**
 * Shared part of every source: observers, connection state and boundary
 * validation. Centralizing it guarantees that the simulator and the BLE strap
 * give exactly the same guarantees to the rest of the system.
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

  /** Resets the time reference when a new connection starts. */
  resetTime(): void {
    this.#lastTimeMs = 0;
  }

  /** Delivers the notification if valid; otherwise discards it and reports the error. */
  notify(notification: BeatNotification): void {
    const result = validateNotification(notification, this.#lastTimeMs);
    if (!result.valid) {
      this.emitError(new SignalSourceError(result.code));
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
