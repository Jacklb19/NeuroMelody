import { describe, it, expect } from 'vitest';
import { es } from '../../../i18n/es';
import { TEST_CHART_PALETTE } from '../../../test/chartPalette';
import { chartLabelsFrom } from '../drawing/chartLabels';
import { SIGNAL_THREAD_ERROR_CODES, isMessageFromThread, isMessageToThread } from './protocol';

const notification = { timeMs: 1000, heartRate: 60, rrIntervalsMs: [1000], sensorContact: null };

const result = {
  timeMs: 5000,
  meanHr: null,
  rmssd: null,
  sdnn: null,
  nnDurationMs: 5000,
  coverageMs: 5000,
  acceptedBeats: 5,
  discardedBeats: 0,
  quality: 'collecting',
  lfPower: null,
  hfPower: null,
  lfHfRatio: null,
};

describe('isMessageToThread', () => {
  it('accepts valid messages', () => {
    expect(isMessageToThread({ kind: 'notification', notification })).toBe(true);
    expect(isMessageToThread({ kind: 'reset' })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'reset'],
    ['an unknown kind', { kind: 'delete' }],
    ['a notification without data', { kind: 'notification' }],
    ['a non-numeric RR', { kind: 'notification', notification: { ...notification, rrIntervalsMs: ['1000'] } }],
    ['a non-finite time', { kind: 'notification', notification: { ...notification, timeMs: Number.NaN } }],
    ['an invalid contact', { kind: 'notification', notification: { ...notification, sensorContact: 'yes' } }],
  ])('rejects %s', (_case, message) => {
    expect(isMessageToThread(message)).toBe(false);
  });
});

describe('isMessageToThread with a canvas', () => {
  const palette = TEST_CHART_PALETTE;
  const labels = chartLabelsFrom(es.common);
  const canvas = { width: 1, height: 1, getContext: () => null };
  const dimensions = { widthCss: 600, heightCss: 224, scale: 2 };

  it('accepts valid init-canvas and resize messages', () => {
    expect(isMessageToThread({ kind: 'init-canvas', canvas, palette, labels, dimensions })).toBe(true);
    expect(isMessageToThread({ kind: 'resize', dimensions })).toBe(true);
  });

  it.each([
    ['a canvas without getContext', { kind: 'init-canvas', canvas: { width: 1, height: 1 }, palette, labels, dimensions }],
    ['a palette with an empty color', { kind: 'init-canvas', canvas, palette: { ...palette, line: ' ' }, labels, dimensions }],
    ['a palette without a font', { kind: 'init-canvas', canvas, palette: { ...palette, font: undefined }, labels, dimensions }],
    ['a palette without a length', { kind: 'init-canvas', canvas, palette: { ...palette, marginLeft: undefined }, labels, dimensions }],
    ['a palette with a length as text', { kind: 'init-canvas', canvas, palette: { ...palette, labelOffset: '6px' }, labels, dimensions }],
    ['a palette with a zero hatch spacing', { kind: 'init-canvas', canvas, palette: { ...palette, hatchSpacing: 0 }, labels, dimensions }],
    ['a palette with an infinite line width', { kind: 'init-canvas', canvas, palette: { ...palette, lineWidthSeries: Number.POSITIVE_INFINITY }, labels, dimensions }],
    ['no labels', { kind: 'init-canvas', canvas, palette, dimensions }],
    ['a tick label without a place for the value', { kind: 'init-canvas', canvas, palette, labels: { rrTick: 'ms' }, dimensions }],
    ['a zero scale', { kind: 'resize', dimensions: { ...dimensions, scale: 0 } }],
    ['a negative width', { kind: 'resize', dimensions: { ...dimensions, widthCss: -1 } }],
  ])('rejects %s', (_case, message) => {
    expect(isMessageToThread(message)).toBe(false);
  });
});

describe('isMessageFromThread', () => {
  it('accepts valid indices and errors', () => {
    expect(isMessageFromThread({ kind: 'indices', result })).toBe(true);
    expect(isMessageFromThread({ kind: 'indices', result: { ...result, rmssd: 45.2, quality: 'good' } })).toBe(true);
    for (const code of SIGNAL_THREAD_ERROR_CODES) {
      expect(isMessageFromThread({ kind: 'error', code })).toBe(true);
    }
    expect(isMessageFromThread({ kind: 'error', code: 'worker_crashed', detail: 'Uncaught Error' })).toBe(true);
  });

  it('rejects spectral indices that are missing or not finite', () => {
    const withoutRatio: Partial<typeof result> = { ...result };
    delete withoutRatio.lfHfRatio;
    expect(isMessageFromThread({ kind: 'indices', result: withoutRatio })).toBe(false);
    expect(isMessageFromThread({ kind: 'indices', result: { ...result, lfPower: Number.NaN } })).toBe(false);
  });

  it.each([
    ['a message without kind', {}],
    ['an unknown quality', { kind: 'indices', result: { ...result, quality: 'alarm' } }],
    ['a non-numeric index', { kind: 'indices', result: { ...result, sdnn: '12' } }],
    ['an error without code', { kind: 'error' }],
    ['an error with an unknown code', { kind: 'error', code: 'failed' }],
    ['an error carrying text instead of a code', { kind: 'error', message: 'failed' }],
    ['a crash without its detail', { kind: 'error', code: 'worker_crashed' }],
  ])('rejects %s', (_case, message) => {
    expect(isMessageFromThread(message)).toBe(false);
  });
});
