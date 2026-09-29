import type { PuertoHilo } from '../features/senal/hilo/ClienteHiloSenal';
import { crearManejadorHiloSenal } from '../features/senal/hilo/manejadorHilo';
import type { MensajeHaciaHilo } from '../features/senal/hilo/protocolo';

export interface PuertoEnProceso extends PuertoHilo {
  readonly enviados: MensajeHaciaHilo[];
  readonly terminado: boolean;
  /** Simula un mensaje arbitrario que llega desde el hilo de señal. */
  recibirDesdeHilo(dato: unknown): void;
}

/**
 * Puerto que ejecuta el manejador del hilo de señal en el mismo proceso y de
 * forma síncrona: jsdom no tiene Workers.
 */
export function crearPuertoEnProceso(): PuertoEnProceso {
  let receptor: (dato: unknown) => void = () => undefined;
  let terminado = false;
  const enviados: MensajeHaciaHilo[] = [];
  const manejar = crearManejadorHiloSenal((mensaje) => {
    receptor(mensaje);
  });

  return {
    enviados,
    get terminado() {
      return terminado;
    },
    enviar: (mensaje) => {
      enviados.push(mensaje);
      manejar(mensaje);
    },
    alRecibir: (nuevo) => {
      receptor = nuevo;
    },
    terminar: () => {
      terminado = true;
    },
    recibirDesdeHilo: (dato) => {
      receptor(dato);
    },
  };
}
