import {
  drawTachogram,
  type DrawingContext,
  type CanvasDimensions,
} from '../../signal/drawing/drawTachogram';
import type { ChartPalette } from '../../signal/drawing/palette';
import { SignalProcessor } from '../processing/SignalProcessor';
import { isMessageToThread, type ThreadCanvas, type MessageFromThread } from './protocol';

interface Chart {
  readonly canvas: ThreadCanvas;
  readonly context: DrawingContext;
  readonly palette: ChartPalette;
  dimensions: CanvasDimensions;
}

/**
 * Lógica del hilo de señal separada del Worker: recibe cada mensaje ya
 * deserializado y responde por `enviar`. El Worker solo la conecta a
 * `onmessage`, y las pruebas la usan directamente en el mismo proceso.
 *
 * Si hay un lienzo transferido, redibuja el tacograma tras cada cambio; sin
 * lienzo, el análisis funciona igual.
 */
export function createSignalThreadHandler(
  send: (message: MessageFromThread) => void,
): (data: unknown) => void {
  const processor = new SignalProcessor((result) => {
    send({ kind: 'indices', result });
  });
  let chart: Chart | null = null;

  const redraw = (): void => {
    if (chart !== null) {
      drawTachogram(chart.context, processor.snapshot, chart.palette, chart.dimensions);
    }
  };

  const resizeCanvas = (g: Chart): void => {
    g.canvas.width = Math.round(g.dimensions.widthCss * g.dimensions.scale);
    g.canvas.height = Math.round(g.dimensions.heightCss * g.dimensions.scale);
  };

  return (data) => {
    if (!isMessageToThread(data)) {
      send({ kind: 'error', message: 'Mensaje no reconocido por el hilo de señal.' });
      return;
    }
    switch (data.kind) {
      case 'notificacion':
        processor.process(data.notification);
        break;
      case 'reiniciar':
        processor.reset();
        break;
      case 'iniciar-lienzo': {
        const context = data.canvas.getContext('2d');
        if (context === null) {
          send({ kind: 'error', message: 'No se pudo obtener el contexto 2D del lienzo.' });
          return;
        }
        chart = { canvas: data.canvas, context, palette: data.palette, dimensions: data.dimensions };
        resizeCanvas(chart);
        break;
      }
      case 'redimensionar':
        if (chart !== null) {
          chart.dimensions = data.dimensions;
          resizeCanvas(chart);
        }
        break;
    }
    redraw();
  };
}
