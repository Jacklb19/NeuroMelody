/**
 * Punto de entrada del Worker de señal: solo conecta los mensajes con el
 * manejador. Todo el cálculo vive en módulos puros que se prueban sin Worker.
 */
import { createSignalThreadHandler } from '../../signal/thread/threadHandler';

const handle = createSignalThreadHandler((message) => {
  self.postMessage(message);
});

self.onmessage = (event: MessageEvent<unknown>) => {
  handle(event.data);
};
