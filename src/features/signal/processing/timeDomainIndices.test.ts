import { describe, it, expect } from 'vitest';
import { computeTimeDomainIndices } from './timeDomainIndices';
import type { ClassifiedBeat } from './types';

function acceptedCount(rr: readonly number[]): ClassifiedBeat[] {
  let end = 0;
  return rr.map((rrMs) => {
    end += rrMs;
    return { endMs: end, rrMs, accepted: true, discardReason: null, contiguousWithPrevious: true };
  });
}

describe('calcularIndicesTemporales', () => {
  it('coincide con los valores calculados a mano para una serie corta', () => {
    // NN = [800, 810, 790, 820]
    // Diferencias: 10, −20, 30 → RMSSD = √((100 + 400 + 900) / 3) = √466,67 = 21,602 ms
    // Media 805; desviaciones −5, 5, −15, 15 → SDNN = √(500 / 3) = 12,910 ms
    // FC media = 60000 / 805 = 74,534 lpm
    const indices = computeTimeDomainIndices(acceptedCount([800, 810, 790, 820]));
    expect(indices.rmssd).toBeCloseTo(21.602, 3);
    expect(indices.sdnn).toBeCloseTo(12.91, 3);
    expect(indices.meanHr).toBeCloseTo(74.534, 3);
    expect(indices.validNn).toBe(4);
    expect(indices.nnDurationMs).toBe(3220);
  });

  it('da RMSSD y SDNN de cero para una serie constante', () => {
    const indices = computeTimeDomainIndices(acceptedCount([1000, 1000, 1000]));
    expect(indices.rmssd).toBe(0);
    expect(indices.sdnn).toBe(0);
    expect(indices.meanHr).toBe(60);
  });

  it('devuelve nulos cuando no hay datos suficientes', () => {
    expect(computeTimeDomainIndices([])).toEqual({
      meanHr: null,
      rmssd: null,
      sdnn: null,
      validNn: 0,
      nnDurationMs: 0,
    });
    const one = computeTimeDomainIndices(acceptedCount([900]));
    expect(one.meanHr).toBeCloseTo(66.667, 3);
    expect(one.rmssd).toBeNull();
    expect(one.sdnn).toBeNull();
  });

  it('excluye los descartados y no forma pares a través de ellos', () => {
    // 800, 810, [500 descartado], 790, 820
    // Pares válidos: (800, 810) y (790, 820) → diferencias 10 y 30
    // RMSSD = √((100 + 900) / 2) = √500 = 22,361 ms
    const series = acceptedCount([800, 810, 500, 790, 820]).map((beat, i) =>
      i === 2 ? { ...beat, accepted: false, discardReason: 'deviation' as const } : beat,
    );
    const indices = computeTimeDomainIndices(series);
    expect(indices.rmssd).toBeCloseTo(22.361, 3);
    expect(indices.validNn).toBe(4);
    expect(indices.sdnn).toBeCloseTo(12.91, 3);
  });

  it('no forma par entre los latidos a ambos lados de una pérdida de contacto', () => {
    // 800, 810 | hueco | 900, 910 → pares (800, 810) y (900, 910); el salto 810 → 900 no cuenta
    const series = acceptedCount([800, 810, 900, 910]).map((beat, i) =>
      i === 2 ? { ...beat, contiguousWithPrevious: false } : beat,
    );
    expect(computeTimeDomainIndices(series).rmssd).toBeCloseTo(10, 6);
  });
});
