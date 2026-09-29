import { describe, it, expect } from 'vitest';
import { esMensajeDesdeHilo, esMensajeHaciaHilo } from './protocolo';

const notificacion = { tiempoMs: 1000, frecuenciaCardiaca: 60, intervalosRRms: [1000], contactoSensor: null };

const resultado = {
  tiempoMs: 5000,
  fcMedia: null,
  rmssd: null,
  sdnn: null,
  duracionNNms: 5000,
  coberturaMs: 5000,
  latidosAceptados: 5,
  latidosDescartados: 0,
  calidad: 'reuniendo',
};

describe('esMensajeHaciaHilo', () => {
  it('acepta los mensajes válidos', () => {
    expect(esMensajeHaciaHilo({ tipo: 'notificacion', notificacion })).toBe(true);
    expect(esMensajeHaciaHilo({ tipo: 'reiniciar' })).toBe(true);
  });

  it.each([
    ['nulo', null],
    ['texto', 'reiniciar'],
    ['tipo desconocido', { tipo: 'borrar' }],
    ['notificación sin datos', { tipo: 'notificacion' }],
    ['RR no numérico', { tipo: 'notificacion', notificacion: { ...notificacion, intervalosRRms: ['1000'] } }],
    ['tiempo no finito', { tipo: 'notificacion', notificacion: { ...notificacion, tiempoMs: Number.NaN } }],
    ['contacto inválido', { tipo: 'notificacion', notificacion: { ...notificacion, contactoSensor: 'sí' } }],
  ])('rechaza %s', (_caso, mensaje) => {
    expect(esMensajeHaciaHilo(mensaje)).toBe(false);
  });
});

describe('esMensajeHaciaHilo con lienzo', () => {
  const paleta = {
    linea: 'a',
    rejilla: 'b',
    texto: 'c',
    descartado: 'd',
    bajaCalidadFondo: 'e',
    bajaCalidadRayado: 'f',
    fuente: '14px sans-serif',
  };
  const lienzo = { width: 1, height: 1, getContext: () => null };
  const dimensiones = { anchoCss: 600, altoCss: 224, escala: 2 };

  it('acepta iniciar-lienzo y redimensionar válidos', () => {
    expect(esMensajeHaciaHilo({ tipo: 'iniciar-lienzo', lienzo, paleta, dimensiones })).toBe(true);
    expect(esMensajeHaciaHilo({ tipo: 'redimensionar', dimensiones })).toBe(true);
  });

  it.each([
    ['lienzo sin getContext', { tipo: 'iniciar-lienzo', lienzo: { width: 1, height: 1 }, paleta, dimensiones }],
    ['paleta con un color vacío', { tipo: 'iniciar-lienzo', lienzo, paleta: { ...paleta, linea: ' ' }, dimensiones }],
    ['paleta sin fuente', { tipo: 'iniciar-lienzo', lienzo, paleta: { ...paleta, fuente: undefined }, dimensiones }],
    ['escala cero', { tipo: 'redimensionar', dimensiones: { ...dimensiones, escala: 0 } }],
    ['ancho negativo', { tipo: 'redimensionar', dimensiones: { ...dimensiones, anchoCss: -1 } }],
  ])('rechaza %s', (_caso, mensaje) => {
    expect(esMensajeHaciaHilo(mensaje)).toBe(false);
  });
});

describe('esMensajeDesdeHilo', () => {
  it('acepta índices y errores válidos', () => {
    expect(esMensajeDesdeHilo({ tipo: 'indices', resultado })).toBe(true);
    expect(esMensajeDesdeHilo({ tipo: 'indices', resultado: { ...resultado, rmssd: 45.2, calidad: 'buena' } })).toBe(true);
    expect(esMensajeDesdeHilo({ tipo: 'error', mensaje: 'falló' })).toBe(true);
  });

  it.each([
    ['sin tipo', {}],
    ['calidad desconocida', { tipo: 'indices', resultado: { ...resultado, calidad: 'alarma' } }],
    ['índice no numérico', { tipo: 'indices', resultado: { ...resultado, sdnn: '12' } }],
    ['error sin mensaje', { tipo: 'error' }],
  ])('rechaza %s', (_caso, mensaje) => {
    expect(esMensajeDesdeHilo(mensaje)).toBe(false);
  });
});
