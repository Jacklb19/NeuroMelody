import { act, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FakeDrawingContext } from '../../test/fakeDrawingContext';
import { createFakeTimeEnvironment } from '../../test/fakeTimeEnvironment';
import { createInProcessPort } from '../../test/inProcessThreadPort';
import type { ScenarioId } from '../acquisition/simulator/scenarios';
import { SimulatedSource } from '../acquisition/simulator/SimulatedSource';
import { ChartPaletteError, type ChartPalette } from './drawing/palette';
import { SignalThreadClient } from './thread/SignalThreadClient';
import { SignalPanel } from './SignalPanel';

const PALETTE: ChartPalette = {
  line: 'rgb(1, 1, 1)',
  grid: 'rgb(2, 2, 2)',
  text: 'rgb(3, 3, 3)',
  discarded: 'rgb(4, 4, 4)',
  lowQualityBackground: 'rgb(5, 5, 5)',
  lowQualityHatch: 'rgb(6, 6, 6)',
  font: '14px sans-serif',
};

function createScene(scenario: ScenarioId = 'rest', readPalette: () => ChartPalette = () => PALETTE) {
  const env = createFakeTimeEnvironment();
  const source = new SimulatedSource({ scenario, seed: 1, speed: 10, ...env });
  const port = createInProcessPort();
  const client = new SignalThreadClient(port);
  const createClient = () => client;
  const context = new FakeDrawingContext();
  // jsdom has no OffscreenCanvas: an object with the same shape is enough.
  const transferCanvas = () =>
    ({ width: 0, height: 0, getContext: () => context }) as unknown as OffscreenCanvas;
  const props = { createClient, readPalette, transferCanvas };
  const view = render(<SignalPanel source={null} {...props} />);

  return {
    env,
    source,
    port,
    context,
    view,
    async connect() {
      view.rerender(<SignalPanel source={source} {...props} />);
      await act(async () => {
        await source.connect();
      });
    },
    advanceSignalSeconds(seconds: number) {
      act(() => {
        env.advance((seconds * 1000) / 10);
      });
    },
  };
}

function visibleQuality(): string {
  return screen.getByRole('status').textContent;
}

describe('SignalPanel', () => {
  it('without a Worker or a transferable canvas, warns and keeps the indicators as text', () => {
    render(<SignalPanel source={null} />);

    expect(screen.getByRole('heading', { level: 2, name: /señal e indicadores/i })).toBeInTheDocument();
    expect(screen.getByText(/el análisis de la señal no está disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/la gráfica no está disponible/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(visibleQuality()).toMatch(/esperando datos de la señal/i);
    expect(screen.getByTestId('rmssd')).toHaveTextContent('—');
  });

  it('shows the collecting-data status and then the indices as text', async () => {
    const scene = createScene();
    await scene.connect();

    scene.advanceSignalSeconds(30);
    expect(visibleQuality()).toMatch(/reuniendo datos/i);
    expect(screen.getByTestId('mean-hr')).toHaveTextContent('—');
    expect(screen.getByTestId('analysis-window')).toHaveTextContent('0:30 de 5:00');

    scene.advanceSignalSeconds(40);
    expect(visibleQuality()).toMatch(/buena/i);
    expect(screen.getByTestId('mean-hr')).toHaveTextContent(/^\d+ lpm$/);
    expect(screen.getByTestId('rmssd')).toHaveTextContent(/^\d+ ms$/);
    expect(screen.getByTestId('sdnn')).toHaveTextContent(/^\d+ ms$/);
    expect(Number(screen.getByTestId('accepted-beats').textContent)).toBeGreaterThan(60);
    expect(screen.getByTestId('discarded-beats')).toHaveTextContent('0');
  });

  it('gives the chart an accessible name, links it to the text summary and draws it with the palette', async () => {
    const scene = createScene();
    await scene.connect();
    scene.advanceSignalSeconds(10);

    const chart = screen.getByRole('img', { name: /tacograma/i });
    const summary = document.getElementById(chart.getAttribute('aria-describedby') ?? '');
    expect(summary?.tagName).toBe('DL');
    expect(chart.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
    expect(scene.context.count('stroke', (o) => o.strokeStyle === PALETTE.line)).toBeGreaterThan(0);
  });

  it('hides only the chart when a palette variable is missing', async () => {
    const scene = createScene('rest', () => {
      throw new ChartPaletteError('Falta la variable CSS --color-chart-line.');
    });
    await scene.connect();
    scene.advanceSignalSeconds(70);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/--color-chart-line/)).toBeInTheDocument();
    expect(screen.getByTestId('rmssd')).toHaveTextContent(/^\d+ ms$/);
  });

  it('reports low quality as text and uses non-clinical vocabulary', async () => {
    const scene = createScene('artifacts');
    await scene.connect();
    scene.advanceSignalSeconds(95); // contact loss between 90 and 95 s
    expect(visibleQuality()).toMatch(/baja: revisa la colocación del dispositivo/i);

    scene.advanceSignalSeconds(205);
    expect(visibleQuality()).toMatch(/buena/i);
    expect(Number(screen.getByTestId('discarded-beats').textContent)).toBeGreaterThan(0);
    expect(screen.getByText(/descartados por calidad de señal/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/anómal|prematur|ectópic|arritmi/i);
  });

  it('does not show results from a previous source', async () => {
    const scene = createScene();
    await scene.connect();
    scene.advanceSignalSeconds(70);
    expect(screen.getByTestId('rmssd')).toHaveTextContent(/ms/);

    scene.view.rerender(<SignalPanel source={null} createClient={() => new SignalThreadClient(createInProcessPort())} />);
    expect(visibleQuality()).toMatch(/esperando datos/i);
    expect(screen.getByTestId('rmssd')).toHaveTextContent('—');
  });

  it('terminates the signal thread and removes the canvas on unmount', async () => {
    const scene = createScene();
    await scene.connect();
    const container = screen.getByRole('img');
    scene.view.unmount();

    expect(scene.port.terminated).toBe(true);
    expect(container.querySelector('canvas')).toBeNull();
  });
});
