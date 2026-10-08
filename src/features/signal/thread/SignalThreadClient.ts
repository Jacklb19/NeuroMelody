import type { SignalSource } from '../../acquisition/contract';
import type { CanvasDimensions } from '../../signal/drawing/drawTachogram';
import type { ChartLabels } from '../../signal/drawing/chartLabels';
import type { ChartPalette } from '../../signal/drawing/palette';
import type { IndicesResult } from '../processing/SignalProcessor';
import {
  WORKER_CRASHED,
  isMessageFromThread,
  type MessageFromThread,
  type MessageToThread,
  type SignalThreadFailure,
} from './protocol';

/** Channel to the signal thread; injectable so it can be tested without a real Worker. */
export interface ThreadPort {
  send(message: MessageToThread, transferables?: Transferable[]): void;
  onReceive(receiver: (data: unknown) => void): void;
  terminate(): void;
}

/** Port over the real Worker, bundled by Vite as a same-origin file. */
export function createWorkerPort(): ThreadPort {
  const worker = new Worker(new URL('./signal.worker.ts', import.meta.url), {
    type: 'module',
  });
  return {
    send: (message, transferables = []) => {
      worker.postMessage(message, transferables);
    },
    onReceive: (receiver) => {
      worker.onmessage = (event: MessageEvent<unknown>) => {
        receiver(event.data);
      };
      // Local failures travel as protocol messages so the client handles them in one place.
      worker.onerror = (event) => {
        const crashed: MessageFromThread = { kind: 'error', code: WORKER_CRASHED, detail: event.message };
        receiver(crashed);
      };
      worker.onmessageerror = () => {
        const unreadable: MessageFromThread = { kind: 'error', code: 'unreadable_message' };
        receiver(unreadable);
      };
    },
    terminate: () => {
      worker.terminate();
    },
  };
}

export interface SignalThreadObserver {
  readonly onIndices?: (result: IndicesResult) => void;
  readonly onError?: (failure: SignalThreadFailure) => void;
}

/**
 * Main-thread side: forwards the source notifications to the signal thread
 * and distributes its results. It performs no computation (RNF-04).
 */
export class SignalThreadClient {
  readonly #port: ThreadPort;
  readonly #observers = new Set<SignalThreadObserver>();

  constructor(port: ThreadPort) {
    this.#port = port;
    port.onReceive((data) => {
      this.#receive(data);
    });
  }

  /** Attaches a source: the signal thread is reset on every new connection. */
  connectSource(source: SignalSource): () => void {
    this.#port.send({ kind: 'reset' });
    return source.subscribe({
      onNotification: (notification) => {
        this.#port.send({ kind: 'notification', notification });
      },
      onStateChange: (state) => {
        // connect() restarts signal time at 0.
        if (state === 'connecting') {
          this.#port.send({ kind: 'reset' });
        }
      },
    });
  }

  /**
   * Transfers the canvas to the signal thread, which draws on it from then
   * on. The palette and the labels are prepared on the main thread, where the
   * CSS variables and the dictionary live.
   */
  attachCanvas(
    canvas: OffscreenCanvas,
    palette: ChartPalette,
    labels: ChartLabels,
    dimensions: CanvasDimensions,
  ): void {
    this.#port.send({ kind: 'init-canvas', canvas, palette, labels, dimensions }, [canvas]);
  }

  resize(dimensions: CanvasDimensions): void {
    this.#port.send({ kind: 'resize', dimensions });
  }

  subscribe(observer: SignalThreadObserver): () => void {
    this.#observers.add(observer);
    return () => {
      this.#observers.delete(observer);
    };
  }

  terminate(): void {
    this.#port.terminate();
    this.#observers.clear();
  }

  #receive(data: unknown): void {
    if (!isMessageFromThread(data)) {
      this.#notifyError({ code: 'unrecognized_response' });
      return;
    }
    if (data.kind === 'error') {
      this.#notifyError(
        data.code === WORKER_CRASHED ? { code: data.code, detail: data.detail } : { code: data.code },
      );
      return;
    }
    for (const observer of this.#observers) {
      observer.onIndices?.(data.result);
    }
  }

  #notifyError(failure: SignalThreadFailure): void {
    for (const observer of this.#observers) {
      observer.onError?.(failure);
    }
  }
}
