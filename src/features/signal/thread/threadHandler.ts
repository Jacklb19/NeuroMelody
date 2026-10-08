import {
  drawTachogram,
  type DrawingContext,
  type CanvasDimensions,
} from '../../signal/drawing/drawTachogram';
import type { ChartLabels } from '../../signal/drawing/chartLabels';
import type { ChartPalette } from '../../signal/drawing/palette';
import { SignalProcessor } from '../processing/SignalProcessor';
import { isMessageToThread, type ThreadCanvas, type MessageFromThread } from './protocol';

interface Chart {
  readonly canvas: ThreadCanvas;
  readonly context: DrawingContext;
  readonly palette: ChartPalette;
  readonly labels: ChartLabels;
  dimensions: CanvasDimensions;
}

/**
 * Signal-thread logic kept apart from the Worker: it receives each message
 * already deserialized and replies through `send`. The Worker only wires it
 * to `onmessage`, and the tests use it directly in the same process.
 *
 * If a canvas has been transferred, it redraws the tachogram after every
 * change; without a canvas, the analysis works the same.
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
      drawTachogram(chart.context, processor.snapshot, chart.palette, chart.labels, chart.dimensions);
    }
  };

  const resizeCanvas = (target: Chart): void => {
    target.canvas.width = Math.round(target.dimensions.widthCss * target.dimensions.scale);
    target.canvas.height = Math.round(target.dimensions.heightCss * target.dimensions.scale);
  };

  return (data) => {
    if (!isMessageToThread(data)) {
      send({ kind: 'error', code: 'unrecognized_message' });
      return;
    }
    switch (data.kind) {
      case 'notification':
        processor.process(data.notification);
        break;
      case 'reset':
        processor.reset();
        break;
      case 'init-canvas': {
        const context = data.canvas.getContext('2d');
        if (context === null) {
          send({ kind: 'error', code: 'no_2d_context' });
          return;
        }
        chart = {
          canvas: data.canvas,
          context,
          palette: data.palette,
          labels: data.labels,
          dimensions: data.dimensions,
        };
        resizeCanvas(chart);
        break;
      }
      case 'resize':
        if (chart !== null) {
          chart.dimensions = data.dimensions;
          resizeCanvas(chart);
        }
        break;
    }
    redraw();
  };
}
