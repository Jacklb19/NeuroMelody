import type { SignalSource } from '../../acquisition/contract';
import type { CanvasDimensions } from '../../signal/drawing/drawTachogram';
import type { ChartPalette } from '../../signal/drawing/palette';
import type { IndicesResult } from '../processing/SignalProcessor';
import { isMessageFromThread, type MessageToThread } from './protocol';

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
      worker.onerror = (event) => {
        receiver({ kind: 'error', message: event.message });
      };
      worker.onmessageerror = () => {
        receiver({ kind: 'error', message: 'No se pudo leer un mensaje del hilo de señal.' });
      };
    },
    terminate: () => {
      worker.terminate();
    },
  };
}

export interface SignalThreadObserver {
  readonly onIndices?: (result: IndicesResult) => void;
  readonly onError?: (message: string) => void;
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
   * on. The palette is read on the main thread, where the CSS variables live.
   */
  attachCanvas(
    canvas: OffscreenCanvas,
    palette: ChartPalette,
    dimensions: CanvasDimensions,
  ): void {
    this.#port.send({ kind: 'init-canvas', canvas, palette, dimensions }, [canvas]);
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
      this.#notifyError('Respuesta no reconocida del hilo de señal.');
      return;
    }
    if (data.kind === 'error') {
      this.#notifyError(data.message);
      return;
    }
    for (const observer of this.#observers) {
      observer.onIndices?.(data.result);
    }
  }

  #notifyError(message: string): void {
    for (const observer of this.#observers) {
      observer.onError?.(message);
    }
  }
}
