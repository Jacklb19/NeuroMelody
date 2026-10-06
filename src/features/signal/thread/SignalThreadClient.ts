import type { SignalSource } from '../../acquisition/contract';
import type { CanvasDimensions } from '../../signal/drawing/drawTachogram';
import type { ChartPalette } from '../../signal/drawing/palette';
import type { IndicesResult } from '../processing/SignalProcessor';
import { isMessageFromThread, type MessageToThread } from './protocol';

/** Canal con el hilo de señal; inyectable para probar sin un Worker real. */
export interface ThreadPort {
  send(message: MessageToThread, transferables?: Transferable[]): void;
  onReceive(receiver: (data: unknown) => void): void;
  terminate(): void;
}

/** Puerto sobre el Worker real, empaquetado por Vite como archivo del mismo origen. */
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
 * Lado del hilo principal: reenvía las notificaciones de la fuente al hilo
 * de señal y reparte sus resultados. No hace ningún cálculo (RNF-04).
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

  /** Conecta una fuente: el hilo de señal se reinicia con cada nueva conexión. */
  connectSource(source: SignalSource): () => void {
    this.#port.send({ kind: 'reset' });
    return source.subscribe({
      onNotification: (notification) => {
        this.#port.send({ kind: 'notification', notification });
      },
      onStateChange: (state) => {
        // conectar() reinicia el tiempo de señal en 0.
        if (state === 'connecting') {
          this.#port.send({ kind: 'reset' });
        }
      },
    });
  }

  /**
   * Transfiere el lienzo al hilo de señal, que dibuja en él a partir de ese
   * momento. La paleta se lee en el hilo principal, donde están las variables CSS.
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
