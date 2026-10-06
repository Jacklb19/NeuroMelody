import type { ThreadPort } from '../features/signal/thread/SignalThreadClient';
import { createSignalThreadHandler } from '../features/signal/thread/threadHandler';
import type { MessageToThread } from '../features/signal/thread/protocol';

export interface InProcessPort extends ThreadPort {
  readonly sent: MessageToThread[];
  readonly terminated: boolean;
  /** Simula un mensaje arbitrario que llega desde el hilo de señal. */
  receiveFromThread(data: unknown): void;
}

/**
 * Puerto que ejecuta el manejador del hilo de señal en el mismo proceso y de
 * forma síncrona: jsdom no tiene Workers.
 */
export function createInProcessPort(): InProcessPort {
  let receiver: (data: unknown) => void = () => undefined;
  let terminated = false;
  const sent: MessageToThread[] = [];
  const handle = createSignalThreadHandler((message) => {
    receiver(message);
  });

  return {
    sent,
    get terminated() {
      return terminated;
    },
    send: (message) => {
      sent.push(message);
      handle(message);
    },
    onReceive: (incoming) => {
      receiver = incoming;
    },
    terminate: () => {
      terminated = true;
    },
    receiveFromThread: (data) => {
      receiver(data);
    },
  };
}
