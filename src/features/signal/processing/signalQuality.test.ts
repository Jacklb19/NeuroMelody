import { describe, it, expect } from 'vitest';
import { isAcceptanceLow, recentAcceptance, addSegment } from './signalQuality';
import type { ClassifiedBeat } from './types';

function beat(endMs: number, accepted: boolean): ClassifiedBeat {
  return {
    endMs,
    rrMs: 1000,
    accepted,
    discardReason: accepted ? null : 'desviacion',
    contiguousWithPrevious: true,
  };
}

describe('aceptacionReciente', () => {
  it('cuenta solo los latidos de los últimos 30 s', () => {
    const beats = [
      beat(5_000, false), // fuera de la ventana (t = 40 s → desde 10 s)
      beat(15_000, true),
      beat(20_000, true),
      beat(30_000, true),
      beat(40_000, false),
    ];
    expect(recentAcceptance(beats, 40_000)).toBe(0.75);
  });

  it('devuelve null si no terminó ningún latido en la ventana', () => {
    expect(recentAcceptance([beat(1_000, true)], 60_000)).toBeNull();
  });
});

describe('aceptacionBaja', () => {
  it('marca baja la señal con menos del 80 % aceptado', () => {
    const fourOfFive = [true, true, true, true, false].map((a, i) => beat(i * 1000 + 1000, a));
    const threeOfFive = [true, true, true, false, false].map((a, i) => beat(i * 1000 + 1000, a));
    expect(isAcceptanceLow(fourOfFive, 5_000)).toBe(false);
    expect(isAcceptanceLow(threeOfFive, 5_000)).toBe(true);
  });

  it('no marca baja la señal cuando no hay latidos recientes (eso es un hueco)', () => {
    expect(isAcceptanceLow([], 5_000)).toBe(false);
  });
});

describe('agregarTramo', () => {
  it('fusiona tramos que se tocan o se solapan', () => {
    let segments = addSegment([], { startMs: 1000, endMs: 2000 });
    segments = addSegment(segments, { startMs: 2000, endMs: 3000 });
    segments = addSegment(segments, { startMs: 2500, endMs: 2800 });
    expect(segments).toEqual([{ startMs: 1000, endMs: 3000 }]);
  });

  it('agrega un tramo separado sin modificar la lista original', () => {
    const originals = [{ startMs: 1000, endMs: 2000 }];
    const segments = addSegment(originals, { startMs: 5000, endMs: 6000 });
    expect(segments).toHaveLength(2);
    expect(originals).toHaveLength(1);
  });
});
