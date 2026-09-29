import {
  dibujarTacograma,
  type ContextoDibujo,
  type DimensionesLienzo,
} from '../../signal/drawing/drawTachogram';
import type { PaletaGrafica } from '../../signal/drawing/palette';
import { ProcesadorSenal } from '../processing/SignalProcessor';
import { esMensajeHaciaHilo, type LienzoHilo, type MensajeDesdeHilo } from './protocol';

interface Grafica {
  readonly lienzo: LienzoHilo;
  readonly contexto: ContextoDibujo;
  readonly paleta: PaletaGrafica;
  dimensiones: DimensionesLienzo;
}

/**
 * Lógica del hilo de señal separada del Worker: recibe cada mensaje ya
 * deserializado y responde por `enviar`. El Worker solo la conecta a
 * `onmessage`, y las pruebas la usan directamente en el mismo proceso.
 *
 * Si hay un lienzo transferido, redibuja el tacograma tras cada cambio; sin
 * lienzo, el análisis funciona igual.
 */
export function crearManejadorHiloSenal(
  enviar: (mensaje: MensajeDesdeHilo) => void,
): (dato: unknown) => void {
  const procesador = new ProcesadorSenal((resultado) => {
    enviar({ tipo: 'indices', resultado });
  });
  let grafica: Grafica | null = null;

  const redibujar = (): void => {
    if (grafica !== null) {
      dibujarTacograma(grafica.contexto, procesador.instantanea, grafica.paleta, grafica.dimensiones);
    }
  };

  const ajustarLienzo = (g: Grafica): void => {
    g.lienzo.width = Math.round(g.dimensiones.anchoCss * g.dimensiones.escala);
    g.lienzo.height = Math.round(g.dimensiones.altoCss * g.dimensiones.escala);
  };

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
      case 'iniciar-lienzo': {
        const contexto = dato.lienzo.getContext('2d');
        if (contexto === null) {
          enviar({ tipo: 'error', mensaje: 'No se pudo obtener el contexto 2D del lienzo.' });
          return;
        }
        grafica = { lienzo: dato.lienzo, contexto, paleta: dato.paleta, dimensiones: dato.dimensiones };
        ajustarLienzo(grafica);
        break;
      }
      case 'redimensionar':
        if (grafica !== null) {
          grafica.dimensiones = dato.dimensiones;
          ajustarLienzo(grafica);
        }
        break;
    }
    redibujar();
  };
}
