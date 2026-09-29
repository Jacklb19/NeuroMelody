import { describe, it, expect } from 'vitest';
import { FakeDrawingContext } from '../../../test/fakeDrawingContext';
import type { ChartPalette } from '../../signal/drawing/palette';
import { createSignalThreadHandler } from './threadHandler';
import type { ThreadCanvas, MessageFromThread } from './protocol';

const PALETTE: ChartPalette = {
  line: 'rgb(1, 1, 1)',
  grid: 'rgb(2, 2, 2)',
  text: 'rgb(3, 3, 3)',
  discarded: 'rgb(4, 4, 4)',
  lowQualityBackground: 'rgb(5, 5, 5)',
  lowQualityHatch: 'rgb(6, 6, 6)',
  font: '14px sans-serif',
};

function createScene(context: FakeDrawingContext | null = new FakeDrawingContext()) {
  const received: MessageFromThread[] = [];
  const handle = createSignalThreadHandler((m) => received.push(m));
  const canvas: ThreadCanvas = { width: 300, height: 150, getContext: () => context };
  return { received, handle, canvas, context };
}

const notification = (timeMs: number) => ({
  kind: 'notificacion',
  notification: { timeMs, heartRate: 60, rrIntervalsMs: [1000], sensorContact: true },
});

describe('crearManejadorHiloSenal', () => {
  it('ajusta el lienzo a la densidad de pantalla y dibuja al iniciarlo', () => {
    const { handle, canvas, context } = createScene();
    handle({
      kind: 'iniciar-lienzo',
      canvas,
      palette: PALETTE,
      dimensions: { widthCss: 500, heightCss: 200, scale: 1.5 },
    });
    expect(canvas.width).toBe(750);
    expect(canvas.height).toBe(300);
    expect(context?.count('clearRect')).toBe(1);
  });

  it('redibuja con cada notificación y al redimensionar', () => {
    const { handle, canvas, context } = createScene();
    handle({ kind: 'iniciar-lienzo', canvas, palette: PALETTE, dimensions: { widthCss: 500, heightCss: 200, scale: 1 } });
    handle(notification(1000));
    handle(notification(2000));
    handle({ kind: 'redimensionar', dimensions: { widthCss: 400, heightCss: 200, scale: 2 } });

    expect(context?.count('clearRect')).toBe(4);
    expect(canvas.width).toBe(800);
  });

  it('procesa las notificaciones aunque no haya lienzo', () => {
    const { handle, received } = createScene();
    handle({ kind: 'redimensionar', dimensions: { widthCss: 400, heightCss: 200, scale: 1 } });
    for (let t = 1000; t <= 5000; t += 1000) {
      handle(notification(t));
    }
    expect(received).toHaveLength(1);
    expect(received[0]?.kind).toBe('indices');
  });

  it('avisa si el lienzo no da un contexto 2D', () => {
    const { handle, canvas, received } = createScene(null);
    handle({ kind: 'iniciar-lienzo', canvas, palette: PALETTE, dimensions: { widthCss: 1, heightCss: 1, scale: 1 } });
    expect(received).toEqual([{ kind: 'error', message: 'No se pudo obtener el contexto 2D del lienzo.' }]);
  });

  it('rechaza un lienzo con una paleta incompleta', () => {
    const { handle, canvas, received, context } = createScene();
    handle({
      kind: 'iniciar-lienzo',
      canvas,
      palette: { ...PALETTE, discarded: '' },
      dimensions: { widthCss: 1, heightCss: 1, scale: 1 },
    });
    expect(received[0]?.kind).toBe('error');
    expect(context?.operations).toEqual([]);
  });
});
