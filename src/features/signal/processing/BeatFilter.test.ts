import { describe, it, expect } from 'vitest';
import { BeatFilter } from './BeatFilter';

function classifySeries(filter: BeatFilter, series: readonly number[]) {
  return series.map((rr) => filter.classify(rr));
}

function withReference(rr = 1000): BeatFilter {
  const filter = new BeatFilter();
  classifySeries(filter, [rr, rr, rr, rr, rr]);
  return filter;
}

describe('FiltroLatidos', () => {
  it('descarta los RR fuera de 300–2000 ms y acepta los límites', () => {
    const filter = new BeatFilter();
    expect(filter.classify(299)).toEqual({ accepted: false, discardReason: 'out_of_range' });
    expect(filter.classify(2001)).toEqual({ accepted: false, discardReason: 'out_of_range' });
    expect(filter.classify(300).accepted).toBe(true);
    expect(filter.classify(2000).accepted).toBe(true);
  });

  it('en el arranque acepta todo lo que esté en rango hasta tener 5 latidos', () => {
    const filter = new BeatFilter();
    const result = classifySeries(filter, [500, 1500, 700, 1900, 400]);
    expect(result.every((c) => c.accepted)).toBe(true);
  });

  it('aplica la regla del 20 % sobre la mediana de los últimos 5 aceptados', () => {
    const filter = withReference(1000);
    expect(filter.classify(1210)).toEqual({ accepted: false, discardReason: 'deviation' });
    expect(filter.classify(790).accepted).toBe(false);
    expect(filter.classify(1190).accepted).toBe(true);
    expect(filter.classify(810).accepted).toBe(true);
  });

  it('acepta una desviación de exactamente el 20 %', () => {
    expect(withReference(1000).classify(1200).accepted).toBe(true);
    expect(withReference(1000).classify(800).accepted).toBe(true);
  });

  it('usa la mediana, que no se deja arrastrar por un valor extremo aceptado', () => {
    const filter = new BeatFilter();
    // Arranque con un valor alto aceptado: mediana de [1000, 1000, 1900, 1000, 1000] = 1000
    classifySeries(filter, [1000, 1000, 1900, 1000, 1000]);
    expect(filter.classify(1300).accepted).toBe(false);
    expect(filter.classify(1050).accepted).toBe(true);
  });

  it('descarta un par prematuro y compensatorio (70 % y 130 %)', () => {
    const filter = withReference(1000);
    expect(classifySeries(filter, [700, 1300, 1000]).map((c) => c.accepted)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('se recupera de un escalón sostenido de 800 a 1000 ms', () => {
    const filter = new BeatFilter();
    const before = classifySeries(filter, Array.from({ length: 20 }, () => 800));
    const after = classifySeries(filter, Array.from({ length: 20 }, () => 1000));

    expect(before.every((c) => c.accepted)).toBe(true);
    // 1000 se aparta un 25 % de 800: los 5 primeros se descartan y reinician la referencia.
    expect(after.slice(0, 5).every((c) => c.discardReason === 'deviation')).toBe(true);
    expect(after.slice(5).every((c) => c.accepted)).toBe(true);
  });

  it('no reinicia la referencia si un latido aceptado corta la racha de descartes', () => {
    const filter = withReference(1000);
    classifySeries(filter, [1300, 1300, 1300, 1300]);
    expect(filter.classify(1000).accepted).toBe(true);
    const result = classifySeries(filter, [1300, 1300, 1300, 1300]);
    expect(result.every((c) => !c.accepted)).toBe(true);
    // La referencia sigue en 1000
    expect(filter.classify(1000).accepted).toBe(true);
  });

  it('los RR fuera de rango no alteran la racha ni la referencia', () => {
    const filter = withReference(1000);
    classifySeries(filter, [1300, 1300, 2500, 1300, 1300, 100, 1300]);
    // Cinco descartes por desviación (ignorando los fuera de rango) → referencia 1300
    expect(filter.classify(1300).accepted).toBe(true);
  });

  it('reiniciar olvida la referencia y vuelve al arranque', () => {
    const filter = withReference(1000);
    filter.reset();
    expect(classifySeries(filter, [600, 600, 600]).every((c) => c.accepted)).toBe(true);
  });
});
