import { describe, it, expect } from 'vitest';
import { crearAleatorio, normalEstandar } from './prng';

describe('crearAleatorio (mulberry32)', () => {
  it('reproduce los valores de referencia de la implementación canónica', () => {
    const aleatorio = crearAleatorio(1);
    expect(aleatorio()).toBe(0.6270739405881613);
    expect(aleatorio()).toBe(0.002735721180215478);
    expect(aleatorio()).toBe(0.5274470399599522);
  });

  it('produce la misma secuencia con la misma semilla y otra con otra semilla', () => {
    const a = crearAleatorio(42);
    const b = crearAleatorio(42);
    const c = crearAleatorio(43);
    const serieA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(serieA);
    expect(Array.from({ length: 5 }, c)).not.toEqual(serieA);
  });

  it('devuelve valores en [0, 1)', () => {
    const aleatorio = crearAleatorio(7);
    for (let i = 0; i < 10_000; i++) {
      const valor = aleatorio();
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
  });
});

describe('normalEstandar', () => {
  it('tiene media ≈ 0 y desviación ≈ 1', () => {
    const aleatorio = crearAleatorio(2026);
    const n = 20_000;
    const muestras = Array.from({ length: n }, () => normalEstandar(aleatorio));
    const media = muestras.reduce((s, x) => s + x, 0) / n;
    const varianza = muestras.reduce((s, x) => s + (x - media) ** 2, 0) / n;

    expect(Math.abs(media)).toBeLessThan(0.03);
    expect(Math.sqrt(varianza)).toBeCloseTo(1, 1);
  });

  it('no produce valores no finitos cuando el generador devuelve 0', () => {
    expect(Number.isFinite(normalEstandar(() => 0))).toBe(true);
  });
});
