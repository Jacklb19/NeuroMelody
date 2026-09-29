import { describe, it, expect } from 'vitest';
import { isMessageFromThread, isMessageToThread } from './protocol';

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
};

describe('esMensajeHaciaHilo', () => {
  it('acepta los mensajes válidos', () => {
    expect(isMessageToThread({ kind: 'notification', notification })).toBe(true);
    expect(isMessageToThread({ kind: 'reset' })).toBe(true);
  });

  it.each([
    ['nulo', null],
    ['texto', 'reset'],
    ['tipo desconocido', { kind: 'borrar' }],
    ['notificación sin datos', { kind: 'notification' }],
    ['RR no numérico', { kind: 'notification', notification: { ...notification, rrIntervalsMs: ['1000'] } }],
    ['tiempo no finito', { kind: 'notification', notification: { ...notification, timeMs: Number.NaN } }],
    ['contacto inválido', { kind: 'notification', notification: { ...notification, sensorContact: 'sí' } }],
  ])('rechaza %s', (_case, message) => {
    expect(isMessageToThread(message)).toBe(false);
  });
});

describe('esMensajeHaciaHilo con lienzo', () => {
  const palette = {
    line: 'a',
    grid: 'b',
    text: 'c',
    discarded: 'd',
    lowQualityBackground: 'e',
    lowQualityHatch: 'f',
    font: '14px sans-serif',
  };
  const canvas = { width: 1, height: 1, getContext: () => null };
  const dimensions = { widthCss: 600, heightCss: 224, scale: 2 };

  it('acepta iniciar-lienzo y redimensionar válidos', () => {
    expect(isMessageToThread({ kind: 'init-canvas', canvas, palette, dimensions })).toBe(true);
    expect(isMessageToThread({ kind: 'resize', dimensions })).toBe(true);
  });

  it.each([
    ['lienzo sin getContext', { kind: 'init-canvas', canvas: { width: 1, height: 1 }, palette, dimensions }],
    ['paleta con un color vacío', { kind: 'init-canvas', canvas, palette: { ...palette, line: ' ' }, dimensions }],
    ['paleta sin fuente', { kind: 'init-canvas', canvas, palette: { ...palette, font: undefined }, dimensions }],
    ['escala cero', { kind: 'resize', dimensions: { ...dimensions, scale: 0 } }],
    ['ancho negativo', { kind: 'resize', dimensions: { ...dimensions, widthCss: -1 } }],
  ])('rechaza %s', (_case, message) => {
    expect(isMessageToThread(message)).toBe(false);
  });
});

describe('esMensajeDesdeHilo', () => {
  it('acepta índices y errores válidos', () => {
    expect(isMessageFromThread({ kind: 'indices', result })).toBe(true);
    expect(isMessageFromThread({ kind: 'indices', result: { ...result, rmssd: 45.2, quality: 'good' } })).toBe(true);
    expect(isMessageFromThread({ kind: 'error', message: 'falló' })).toBe(true);
  });

  it.each([
    ['sin tipo', {}],
    ['calidad desconocida', { kind: 'indices', result: { ...result, quality: 'alarma' } }],
    ['índice no numérico', { kind: 'indices', result: { ...result, sdnn: '12' } }],
    ['error sin mensaje', { kind: 'error' }],
  ])('rechaza %s', (_case, message) => {
    expect(isMessageFromThread(message)).toBe(false);
  });
});
