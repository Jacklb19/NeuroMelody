import { act, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { es } from '../../i18n/es';
import { FakeDrawingContext } from '../../test/fakeDrawingContext';
import { createFakeTimeEnvironment } from '../../test/fakeTimeEnvironment';
import { createInProcessPort } from '../../test/inProcessThreadPort';
import type { ScenarioId } from '../acquisition/simulator/scenarios';
import { SimulatedSource } from '../acquisition/simulator/SimulatedSource';
import { ChartPaletteError, type ChartPalette } from './drawing/palette';
import { SignalThreadClient } from './thread/SignalThreadClient';
import { ANALYSIS_WINDOW_MS, MIN_SPECTRUM_MS } from './processing/thresholds';
import { MS_PER_MINUTE } from '../../shared/time';
import { SignalPanel } from './SignalPanel';

const { signal: copy, common } = es;

const PALETTE: ChartPalette = {
  line: 'rgb(1, 1, 1)',
  grid: 'rgb(2, 2, 2)',
  text: 'rgb(3, 3, 3)',
  discarded: 'rgb(4, 4, 4)',
  lowQualityBackground: 'rgb(5, 5, 5)',
  lowQualityHatch: 'rgb(6, 6, 6)',
  font: '14px sans-serif',
  marginLeft: 56,
  marginRight: 24,
  marginTop: 8,
  marginBottom: 24,
  labelOffset: 6,
  hatchSpacing: 8,
  markerHalfSize: 4,
  lineWidthGrid: 1,
  lineWidthHatch: 1,
  lineWidthSeries: 2,
  lineWidthDiscarded: 1.5,
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

/** A whole figure followed by its unit, as the panel writes it. */
function figureWith(unit: string): RegExp {
  return new RegExp(`^${common.withUnit(String.raw`\d+`, unit)}$`);
}

describe('SignalPanel', () => {
  it('without a Worker or a transferable canvas, warns and keeps the indicators as text', () => {
    render(<SignalPanel source={null} />);

    expect(screen.getByRole('heading', { level: 2, name: copy.title })).toBeInTheDocument();
    expect(screen.getByText(copy.threadUnavailable)).toBeInTheDocument();
    expect(screen.getByText(copy.chart.unavailable(copy.chart.noOffscreenCanvas))).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(visibleQuality()).toBe(`${copy.qualityLabel} ${copy.waitingForData}`);
    expect(screen.getByTestId('rmssd')).toHaveTextContent(common.noValue);
  });

  it('shows the collecting-data status and then the indices as text', async () => {
    const scene = createScene();
    await scene.connect();

    scene.advanceSignalSeconds(30);
    expect(visibleQuality()).toContain(copy.quality.collecting);
    expect(screen.getByTestId('mean-hr')).toHaveTextContent(common.noValue);
    expect(screen.getByTestId('analysis-window')).toHaveTextContent(copy.windowCoverage('0:30', '5:00'));
    expect(screen.getByTestId('lf-hf-ratio')).toHaveTextContent(
      copy.spectrumCollecting(common.withUnit(String(MIN_SPECTRUM_MS / MS_PER_MINUTE), common.units.minutes)),
    );

    scene.advanceSignalSeconds(40);
    expect(visibleQuality()).toContain(copy.quality.good);
    expect(screen.getByTestId('mean-hr')).toHaveTextContent(figureWith(common.units.beatsPerMinute));
    expect(screen.getByTestId('rmssd')).toHaveTextContent(figureWith(common.units.milliseconds));
    expect(screen.getByTestId('sdnn')).toHaveTextContent(figureWith(common.units.milliseconds));
    expect(Number(screen.getByTestId('accepted-beats').textContent)).toBeGreaterThan(60);
    expect(screen.getByTestId('discarded-beats')).toHaveTextContent('0');
  });

  it('gives the chart an accessible name, links it to the text summary and draws it with the palette', async () => {
    const scene = createScene();
    await scene.connect();
    scene.advanceSignalSeconds(10);

    const chart = screen.getByRole('img', { name: copy.chart.accessibleName(ANALYSIS_WINDOW_MS / MS_PER_MINUTE) });
    const summary = document.getElementById(chart.getAttribute('aria-describedby') ?? '');
    expect(summary?.tagName).toBe('DL');
    const canvas = chart.querySelector('canvas');
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    // Sized by the stylesheet, not by inline styles.
    expect(canvas?.hasAttribute('style')).toBe(false);
    expect(scene.context.count('stroke', (o) => o.strokeStyle === PALETTE.line)).toBeGreaterThan(0);
  });

  it('hides only the chart when a palette variable is missing', async () => {
    const scene = createScene('rest', () => {
      throw new ChartPaletteError('missing_variable', '--color-chart-line');
    });
    await scene.connect();
    scene.advanceSignalSeconds(70);

    const reason = copy.chart.stylesMissing(copy.chart.paletteErrors.missing_variable('--color-chart-line'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(copy.chart.unavailable(reason))).toBeInTheDocument();
    expect(screen.getByTestId('rmssd')).toHaveTextContent(figureWith(common.units.milliseconds));
  });

  it('reports low quality as text and uses non-clinical vocabulary', async () => {
    const scene = createScene('artifacts');
    await scene.connect();
    scene.advanceSignalSeconds(95); // contact loss between 90 and 95 s
    expect(visibleQuality()).toContain(copy.quality.low);

    scene.advanceSignalSeconds(205);
    expect(visibleQuality()).toContain(copy.quality.good);
    expect(Number(screen.getByTestId('discarded-beats').textContent)).toBeGreaterThan(0);
    expect(screen.getByText(copy.metrics.discardedBeats)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/anómal|prematur|ectópic|arritmi/i);
  });

  it('shows why the analysis stopped updating', () => {
    const scene = createScene();
    act(() => {
      scene.port.receiveFromThread({ kind: 'error', code: 'no_2d_context' });
    });

    expect(screen.getByText(copy.threadFailed(copy.errors.no_2d_context))).toBeInTheDocument();
  });

  it('does not show results from a previous source', async () => {
    const scene = createScene();
    await scene.connect();
    scene.advanceSignalSeconds(70);
    expect(screen.getByTestId('rmssd')).toHaveTextContent(figureWith(common.units.milliseconds));

    scene.view.rerender(<SignalPanel source={null} createClient={() => new SignalThreadClient(createInProcessPort())} />);
    expect(visibleQuality()).toContain(copy.waitingForData);
    expect(screen.getByTestId('rmssd')).toHaveTextContent(common.noValue);
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
