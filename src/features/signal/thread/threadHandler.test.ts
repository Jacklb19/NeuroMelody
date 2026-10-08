import { describe, it, expect } from 'vitest';
import { es } from '../../../i18n/es';
import { FakeDrawingContext } from '../../../test/fakeDrawingContext';
import { chartLabelsFrom } from '../drawing/chartLabels';
import { TEST_CHART_PALETTE } from '../../../test/chartPalette';
import { createSignalThreadHandler } from './threadHandler';
import type { ThreadCanvas, MessageFromThread } from './protocol';

const PALETTE = TEST_CHART_PALETTE;
const LABELS = chartLabelsFrom(es.common);

function createScene(context: FakeDrawingContext | null = new FakeDrawingContext()) {
  const received: MessageFromThread[] = [];
  const handle = createSignalThreadHandler((m) => received.push(m));
  const canvas: ThreadCanvas = { width: 300, height: 150, getContext: () => context };
  return { received, handle, canvas, context };
}

const notification = (timeMs: number) => ({
  kind: 'notification',
  notification: { timeMs, heartRate: 60, rrIntervalsMs: [1000], sensorContact: true },
});

describe('createSignalThreadHandler', () => {
  it('fits the canvas to the screen density and draws when it is initialized', () => {
    const { handle, canvas, context } = createScene();
    handle({
      kind: 'init-canvas',
      canvas,
      palette: PALETTE,
      labels: LABELS,
      dimensions: { widthCss: 500, heightCss: 200, scale: 1.5 },
    });
    expect(canvas.width).toBe(750);
    expect(canvas.height).toBe(300);
    expect(context?.count('clearRect')).toBe(1);
  });

  it('redraws on every notification and on resize', () => {
    const { handle, canvas, context } = createScene();
    handle({ kind: 'init-canvas', canvas, palette: PALETTE, labels: LABELS, dimensions: { widthCss: 500, heightCss: 200, scale: 1 } });
    handle(notification(1000));
    handle(notification(2000));
    handle({ kind: 'resize', dimensions: { widthCss: 400, heightCss: 200, scale: 2 } });

    expect(context?.count('clearRect')).toBe(4);
    expect(canvas.width).toBe(800);
  });

  it('processes notifications even without a canvas', () => {
    const { handle, received } = createScene();
    handle({ kind: 'resize', dimensions: { widthCss: 400, heightCss: 200, scale: 1 } });
    for (let t = 1000; t <= 5000; t += 1000) {
      handle(notification(t));
    }
    expect(received).toHaveLength(1);
    expect(received[0]?.kind).toBe('indices');
  });

  it('reports when the canvas provides no 2D context', () => {
    const { handle, canvas, received } = createScene(null);
    handle({ kind: 'init-canvas', canvas, palette: PALETTE, labels: LABELS, dimensions: { widthCss: 1, heightCss: 1, scale: 1 } });
    expect(received).toEqual([{ kind: 'error', code: 'no_2d_context' }]);
  });

  it('rejects a canvas with an incomplete palette', () => {
    const { handle, canvas, received, context } = createScene();
    handle({
      kind: 'init-canvas',
      canvas,
      palette: { ...PALETTE, discarded: '' },
      labels: LABELS,
      dimensions: { widthCss: 1, heightCss: 1, scale: 1 },
    });
    expect(received).toEqual([{ kind: 'error', code: 'unrecognized_message' }]);
    expect(context?.operations).toEqual([]);
  });
});
