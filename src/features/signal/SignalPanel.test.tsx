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

function createScene(scenario: ScenarioId = 'reposo', readPalette: () => ChartPalette = () => PALETTE) {
  const env = createFakeTimeEnvironment();
  const source = new SimulatedSource({ scenario, seed: 1, speed: 10, ...env });
  const port = createInProcessPort();
  const client = new SignalThreadClient(port);
  const createClient = () => client;
  const context = new FakeDrawingContext();
  // jsdom no tiene OffscreenCanvas: basta un objeto con la misma forma.
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

describe('PanelSenal', () => {
  it('sin Worker ni lienzo transferible avisa y mantiene los indicadores en texto', () => {
    render(<SignalPanel source={null} />);

    expect(screen.getByRole('heading', { level: 2, name: /señal e indicadores/i })).toBeInTheDocument();
    expect(screen.getByText(/el análisis de la señal no está disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/la gráfica no está disponible/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(visibleQuality()).toMatch(/esperando datos de la señal/i);
    expect(screen.getByTestId('rmssd')).toHaveTextContent('—');
  });

  it('muestra "reuniendo datos" y luego los índices en texto', async () => {
    const scene = createScene();
    await scene.connect();

    scene.advanceSignalSeconds(30);
    expect(visibleQuality()).toMatch(/reuniendo datos/i);
    expect(screen.getByTestId('fc-media')).toHaveTextContent('—');
    expect(screen.getByTestId('ventana')).toHaveTextContent('0:30 de 5:00');

    scene.advanceSignalSeconds(40);
    expect(visibleQuality()).toMatch(/buena/i);
    expect(screen.getByTestId('fc-media')).toHaveTextContent(/^\d+ lpm$/);
    expect(screen.getByTestId('rmssd')).toHaveTextContent(/^\d+ ms$/);
    expect(screen.getByTestId('sdnn')).toHaveTextContent(/^\d+ ms$/);
    expect(Number(screen.getByTestId('aceptados').textContent)).toBeGreaterThan(60);
    expect(screen.getByTestId('descartados')).toHaveTextContent('0');
  });

  it('la gráfica tiene nombre accesible, apunta al resumen en texto y se dibuja con la paleta', async () => {
    const scene = createScene();
    await scene.connect();
    scene.advanceSignalSeconds(10);

    const chart = screen.getByRole('img', { name: /tacograma/i });
    const summary = document.getElementById(chart.getAttribute('aria-describedby') ?? '');
    expect(summary?.tagName).toBe('DL');
    expect(chart.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
    expect(scene.context.count('stroke', (o) => o.strokeStyle === PALETTE.line)).toBeGreaterThan(0);
  });

  it('con una variable de la paleta ausente oculta solo la gráfica', async () => {
    const scene = createScene('reposo', () => {
      throw new ChartPaletteError('Falta la variable CSS --color-grafica-linea.');
    });
    await scene.connect();
    scene.advanceSignalSeconds(70);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/--color-grafica-linea/)).toBeInTheDocument();
    expect(screen.getByTestId('rmssd')).toHaveTextContent(/^\d+ ms$/);
  });

  it('avisa la baja calidad en texto y usa un vocabulario no clínico', async () => {
    const scene = createScene('artefactos');
    await scene.connect();
    scene.advanceSignalSeconds(95); // pérdida de contacto entre 90 y 95 s
    expect(visibleQuality()).toMatch(/baja: revisa la colocación del dispositivo/i);

    scene.advanceSignalSeconds(205);
    expect(visibleQuality()).toMatch(/buena/i);
    expect(Number(screen.getByTestId('descartados').textContent)).toBeGreaterThan(0);
    expect(screen.getByText(/descartados por calidad de señal/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/anómal|prematur|ectópic|arritmi/i);
  });

  it('no muestra resultados de una fuente anterior', async () => {
    const scene = createScene();
    await scene.connect();
    scene.advanceSignalSeconds(70);
    expect(screen.getByTestId('rmssd')).toHaveTextContent(/ms/);

    scene.view.rerender(<SignalPanel source={null} createClient={() => new SignalThreadClient(createInProcessPort())} />);
    expect(visibleQuality()).toMatch(/esperando datos/i);
    expect(screen.getByTestId('rmssd')).toHaveTextContent('—');
  });

  it('al desmontarse termina el hilo de señal y retira el lienzo', async () => {
    const scene = createScene();
    await scene.connect();
    const container = screen.getByRole('img');
    scene.view.unmount();

    expect(scene.port.terminated).toBe(true);
    expect(container.querySelector('canvas')).toBeNull();
  });
});
