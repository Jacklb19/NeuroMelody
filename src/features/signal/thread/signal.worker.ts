/**
 * Signal Worker entry point: it only wires the messages to the handler. All
 * computation lives in pure modules that are tested without a Worker.
 */
import { createSignalThreadHandler } from '../../signal/thread/threadHandler';

const handle = createSignalThreadHandler((message) => {
  self.postMessage(message);
});

self.onmessage = (event: MessageEvent<unknown>) => {
  handle(event.data);
};
