/**
 * Punto de entrada del Worker de señal: solo conecta los mensajes con el
 * manejador. Todo el cálculo vive en módulos puros que se prueban sin Worker.
 */
import { crearManejadorHiloSenal } from './manejadorHilo';

const manejar = crearManejadorHiloSenal((mensaje) => {
  self.postMessage(mensaje);
});

self.onmessage = (evento: MessageEvent<unknown>) => {
  manejar(evento.data);
};
