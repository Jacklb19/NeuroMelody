import type { ThreadPort } from '../features/signal/thread/SignalThreadClient';
import { createSignalThreadHandler } from '../features/signal/thread/threadHandler';
import type { MessageToThread } from '../features/signal/thread/protocol';

export interface InProcessPort extends ThreadPort {
  readonly sent: MessageToThread[];
  readonly terminated: boolean;
  /** Simulates an arbitrary message arriving from the signal thread. */
  receiveFromThread(data: unknown): void;
}

/**
 * Port that runs the signal thread handler in the same process and
 * synchronously: jsdom has no Workers.
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
