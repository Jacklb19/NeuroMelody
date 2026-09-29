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
  quality: 'reuniendo',
};

describe('esMensajeHaciaHilo', () => {
  it('acepta los mensajes válidos', () => {
    expect(isMessageToThread({ kind: 'notificacion', notification })).toBe(true);
    expect(isMessageToThread({ kind: 'reiniciar' })).toBe(true);
  });

  it.each([
    ['nulo', null],
    ['texto', 'reiniciar'],
    ['tipo desconocido', { kind: 'borrar' }],
    ['notificación sin datos', { kind: 'notificacion' }],
    ['RR no numérico', { kind: 'notificacion', notification: { ...notification, rrIntervalsMs: ['1000'] } }],
    ['tiempo no finito', { kind: 'notificacion', notification: { ...notification, timeMs: Number.NaN } }],
    ['contacto inválido', { kind: 'notificacion', notification: { ...notification, sensorContact: 'sí' } }],
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
    expect(isMessageToThread({ kind: 'iniciar-lienzo', canvas, palette, dimensions })).toBe(true);
    expect(isMessageToThread({ kind: 'redimensionar', dimensions })).toBe(true);
  });

  it.each([
    ['lienzo sin getContext', { kind: 'iniciar-lienzo', canvas: { width: 1, height: 1 }, palette, dimensions }],
    ['paleta con un color vacío', { kind: 'iniciar-lienzo', canvas, palette: { ...palette, line: ' ' }, dimensions }],
    ['paleta sin fuente', { kind: 'iniciar-lienzo', canvas, palette: { ...palette, font: undefined }, dimensions }],
    ['escala cero', { kind: 'redimensionar', dimensions: { ...dimensions, scale: 0 } }],
    ['ancho negativo', { kind: 'redimensionar', dimensions: { ...dimensions, widthCss: -1 } }],
  ])('rechaza %s', (_case, message) => {
    expect(isMessageToThread(message)).toBe(false);
  });
});

describe('esMensajeDesdeHilo', () => {
  it('acepta índices y errores válidos', () => {
    expect(isMessageFromThread({ kind: 'indices', result })).toBe(true);
    expect(isMessageFromThread({ kind: 'indices', result: { ...result, rmssd: 45.2, quality: 'buena' } })).toBe(true);
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
