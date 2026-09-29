import { describe, it, expect } from 'vitest';
import { aceptacionBaja, aceptacionReciente, agregarTramo } from './signalQuality';
import type { LatidoClasificado } from './types';

function latido(finMs: number, aceptado: boolean): LatidoClasificado {
  return {
    finMs,
    rrMs: 1000,
    aceptado,
    motivoDescarte: aceptado ? null : 'desviacion',
    contiguoAlAnterior: true,
  };
}

describe('aceptacionReciente', () => {
  it('cuenta solo los latidos de los últimos 30 s', () => {
    const latidos = [
      latido(5_000, false), // fuera de la ventana (t = 40 s → desde 10 s)
      latido(15_000, true),
      latido(20_000, true),
      latido(30_000, true),
      latido(40_000, false),
    ];
    expect(aceptacionReciente(latidos, 40_000)).toBe(0.75);
  });

  it('devuelve null si no terminó ningún latido en la ventana', () => {
    expect(aceptacionReciente([latido(1_000, true)], 60_000)).toBeNull();
  });
});

describe('aceptacionBaja', () => {
  it('marca baja la señal con menos del 80 % aceptado', () => {
    const cuatroDeCinco = [true, true, true, true, false].map((a, i) => latido(i * 1000 + 1000, a));
    const tresDeCinco = [true, true, true, false, false].map((a, i) => latido(i * 1000 + 1000, a));
    expect(aceptacionBaja(cuatroDeCinco, 5_000)).toBe(false);
    expect(aceptacionBaja(tresDeCinco, 5_000)).toBe(true);
  });

  it('no marca baja la señal cuando no hay latidos recientes (eso es un hueco)', () => {
    expect(aceptacionBaja([], 5_000)).toBe(false);
  });
});

describe('agregarTramo', () => {
  it('fusiona tramos que se tocan o se solapan', () => {
    let tramos = agregarTramo([], { inicioMs: 1000, finMs: 2000 });
    tramos = agregarTramo(tramos, { inicioMs: 2000, finMs: 3000 });
    tramos = agregarTramo(tramos, { inicioMs: 2500, finMs: 2800 });
    expect(tramos).toEqual([{ inicioMs: 1000, finMs: 3000 }]);
  });

  it('agrega un tramo separado sin modificar la lista original', () => {
    const originales = [{ inicioMs: 1000, finMs: 2000 }];
    const tramos = agregarTramo(originales, { inicioMs: 5000, finMs: 6000 });
    expect(tramos).toHaveLength(2);
    expect(originales).toHaveLength(1);
  });
});
