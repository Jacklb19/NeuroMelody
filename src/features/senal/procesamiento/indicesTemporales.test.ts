import { describe, it, expect } from 'vitest';
import { calcularIndicesTemporales } from './indicesTemporales';
import type { LatidoClasificado } from './tipos';

function aceptados(rr: readonly number[]): LatidoClasificado[] {
  let fin = 0;
  return rr.map((rrMs) => {
    fin += rrMs;
    return { finMs: fin, rrMs, aceptado: true, motivoDescarte: null, contiguoAlAnterior: true };
  });
}

describe('calcularIndicesTemporales', () => {
  it('coincide con los valores calculados a mano para una serie corta', () => {
    // NN = [800, 810, 790, 820]
    // Diferencias: 10, −20, 30 → RMSSD = √((100 + 400 + 900) / 3) = √466,67 = 21,602 ms
    // Media 805; desviaciones −5, 5, −15, 15 → SDNN = √(500 / 3) = 12,910 ms
    // FC media = 60000 / 805 = 74,534 lpm
    const indices = calcularIndicesTemporales(aceptados([800, 810, 790, 820]));
    expect(indices.rmssd).toBeCloseTo(21.602, 3);
    expect(indices.sdnn).toBeCloseTo(12.91, 3);
    expect(indices.fcMedia).toBeCloseTo(74.534, 3);
    expect(indices.nnValidos).toBe(4);
    expect(indices.duracionNNms).toBe(3220);
  });

  it('da RMSSD y SDNN de cero para una serie constante', () => {
    const indices = calcularIndicesTemporales(aceptados([1000, 1000, 1000]));
    expect(indices.rmssd).toBe(0);
    expect(indices.sdnn).toBe(0);
    expect(indices.fcMedia).toBe(60);
  });

  it('devuelve nulos cuando no hay datos suficientes', () => {
    expect(calcularIndicesTemporales([])).toEqual({
      fcMedia: null,
      rmssd: null,
      sdnn: null,
      nnValidos: 0,
      duracionNNms: 0,
    });
    const uno = calcularIndicesTemporales(aceptados([900]));
    expect(uno.fcMedia).toBeCloseTo(66.667, 3);
    expect(uno.rmssd).toBeNull();
    expect(uno.sdnn).toBeNull();
  });

  it('excluye los descartados y no forma pares a través de ellos', () => {
    // 800, 810, [500 descartado], 790, 820
    // Pares válidos: (800, 810) y (790, 820) → diferencias 10 y 30
    // RMSSD = √((100 + 900) / 2) = √500 = 22,361 ms
    const serie = aceptados([800, 810, 500, 790, 820]).map((latido, i) =>
      i === 2 ? { ...latido, aceptado: false, motivoDescarte: 'desviacion' as const } : latido,
    );
    const indices = calcularIndicesTemporales(serie);
    expect(indices.rmssd).toBeCloseTo(22.361, 3);
    expect(indices.nnValidos).toBe(4);
    expect(indices.sdnn).toBeCloseTo(12.91, 3);
  });

  it('no forma par entre los latidos a ambos lados de una pérdida de contacto', () => {
    // 800, 810 | hueco | 900, 910 → pares (800, 810) y (900, 910); el salto 810 → 900 no cuenta
    const serie = aceptados([800, 810, 900, 910]).map((latido, i) =>
      i === 2 ? { ...latido, contiguoAlAnterior: false } : latido,
    );
    expect(calcularIndicesTemporales(serie).rmssd).toBeCloseTo(10, 6);
  });
});
