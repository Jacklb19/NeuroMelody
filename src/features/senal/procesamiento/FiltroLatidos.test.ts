import { describe, it, expect } from 'vitest';
import { FiltroLatidos } from './FiltroLatidos';

function clasificarSerie(filtro: FiltroLatidos, serie: readonly number[]) {
  return serie.map((rr) => filtro.clasificar(rr));
}

function conReferencia(rr = 1000): FiltroLatidos {
  const filtro = new FiltroLatidos();
  clasificarSerie(filtro, [rr, rr, rr, rr, rr]);
  return filtro;
}

describe('FiltroLatidos', () => {
  it('descarta los RR fuera de 300–2000 ms y acepta los límites', () => {
    const filtro = new FiltroLatidos();
    expect(filtro.clasificar(299)).toEqual({ aceptado: false, motivoDescarte: 'fuera_de_rango' });
    expect(filtro.clasificar(2001)).toEqual({ aceptado: false, motivoDescarte: 'fuera_de_rango' });
    expect(filtro.clasificar(300).aceptado).toBe(true);
    expect(filtro.clasificar(2000).aceptado).toBe(true);
  });

  it('en el arranque acepta todo lo que esté en rango hasta tener 5 latidos', () => {
    const filtro = new FiltroLatidos();
    const resultado = clasificarSerie(filtro, [500, 1500, 700, 1900, 400]);
    expect(resultado.every((c) => c.aceptado)).toBe(true);
  });

  it('aplica la regla del 20 % sobre la mediana de los últimos 5 aceptados', () => {
    const filtro = conReferencia(1000);
    expect(filtro.clasificar(1210)).toEqual({ aceptado: false, motivoDescarte: 'desviacion' });
    expect(filtro.clasificar(790).aceptado).toBe(false);
    expect(filtro.clasificar(1190).aceptado).toBe(true);
    expect(filtro.clasificar(810).aceptado).toBe(true);
  });

  it('acepta una desviación de exactamente el 20 %', () => {
    expect(conReferencia(1000).clasificar(1200).aceptado).toBe(true);
    expect(conReferencia(1000).clasificar(800).aceptado).toBe(true);
  });

  it('usa la mediana, que no se deja arrastrar por un valor extremo aceptado', () => {
    const filtro = new FiltroLatidos();
    // Arranque con un valor alto aceptado: mediana de [1000, 1000, 1900, 1000, 1000] = 1000
    clasificarSerie(filtro, [1000, 1000, 1900, 1000, 1000]);
    expect(filtro.clasificar(1300).aceptado).toBe(false);
    expect(filtro.clasificar(1050).aceptado).toBe(true);
  });

  it('descarta un par prematuro y compensatorio (70 % y 130 %)', () => {
    const filtro = conReferencia(1000);
    expect(clasificarSerie(filtro, [700, 1300, 1000]).map((c) => c.aceptado)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('se recupera de un escalón sostenido de 800 a 1000 ms', () => {
    const filtro = new FiltroLatidos();
    const antes = clasificarSerie(filtro, Array.from({ length: 20 }, () => 800));
    const despues = clasificarSerie(filtro, Array.from({ length: 20 }, () => 1000));

    expect(antes.every((c) => c.aceptado)).toBe(true);
    // 1000 se aparta un 25 % de 800: los 5 primeros se descartan y reinician la referencia.
    expect(despues.slice(0, 5).every((c) => c.motivoDescarte === 'desviacion')).toBe(true);
    expect(despues.slice(5).every((c) => c.aceptado)).toBe(true);
  });

  it('no reinicia la referencia si un latido aceptado corta la racha de descartes', () => {
    const filtro = conReferencia(1000);
    clasificarSerie(filtro, [1300, 1300, 1300, 1300]);
    expect(filtro.clasificar(1000).aceptado).toBe(true);
    const resultado = clasificarSerie(filtro, [1300, 1300, 1300, 1300]);
    expect(resultado.every((c) => !c.aceptado)).toBe(true);
    // La referencia sigue en 1000
    expect(filtro.clasificar(1000).aceptado).toBe(true);
  });

  it('los RR fuera de rango no alteran la racha ni la referencia', () => {
    const filtro = conReferencia(1000);
    clasificarSerie(filtro, [1300, 1300, 2500, 1300, 1300, 100, 1300]);
    // Cinco descartes por desviación (ignorando los fuera de rango) → referencia 1300
    expect(filtro.clasificar(1300).aceptado).toBe(true);
  });

  it('reiniciar olvida la referencia y vuelve al arranque', () => {
    const filtro = conReferencia(1000);
    filtro.reiniciar();
    expect(clasificarSerie(filtro, [600, 600, 600]).every((c) => c.aceptado)).toBe(true);
  });
});
