import { ProcesadorSenal } from '../procesamiento/ProcesadorSenal';
import { esMensajeHaciaHilo, type MensajeDesdeHilo } from './protocolo';

/**
 * Lógica del hilo de señal separada del Worker: recibe cada mensaje ya
 * deserializado y responde por `enviar`. El Worker solo la conecta a
 * `onmessage`, y las pruebas la usan directamente en el mismo proceso.
 */
export function crearManejadorHiloSenal(
  enviar: (mensaje: MensajeDesdeHilo) => void,
): (dato: unknown) => void {
  const procesador = new ProcesadorSenal((resultado) => {
    enviar({ tipo: 'indices', resultado });
  });

  return (dato) => {
    if (!esMensajeHaciaHilo(dato)) {
      enviar({ tipo: 'error', mensaje: 'Mensaje no reconocido por el hilo de señal.' });
      return;
    }
    switch (dato.tipo) {
      case 'notificacion':
        procesador.procesar(dato.notificacion);
        break;
      case 'reiniciar':
        procesador.reiniciar();
        break;
    }
  };
}
