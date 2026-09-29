import { describe, it, expect } from 'vitest';
import { TECHO, recortarBloque, recortarSuave } from './recorte';

describe('recortarSuave', () => {
  it('el techo corresponde a −1 dBFS', () => {
    expect(20 * Math.log10(TECHO)).toBeCloseTo(-1, 10);
  });

  it.each([1, 2, 10, 1e6, -1, -10, -1e6])('nunca supera el techo con la entrada %s', (x) => {
    expect(Math.abs(recortarSuave(x))).toBeLessThanOrEqual(TECHO);
  });

  it('casi no modifica las señales pequeñas', () => {
    expect(recortarSuave(0)).toBe(0);
    expect(recortarSuave(0.1)).toBeCloseTo(0.1, 2);
    expect(Math.abs(recortarSuave(0.1) - 0.1) / 0.1).toBeLessThan(0.005);
  });

  it('es monótono y simétrico', () => {
    let anterior = recortarSuave(-3);
    for (let x = -3; x <= 3; x += 0.01) {
      const valor = recortarSuave(x);
      expect(valor).toBeGreaterThanOrEqual(anterior);
      expect(recortarSuave(-x)).toBeCloseTo(-valor, 12);
      anterior = valor;
    }
  });
});

describe('recortarBloque', () => {
  it('recorta en su sitio y devuelve el pico', () => {
    const bloque = new Float32Array([0.1, -5, 0.5, 3]);
    const pico = recortarBloque(bloque);
    expect(Math.max(...Array.from(bloque, Math.abs))).toBeLessThanOrEqual(TECHO);
    expect(pico).toBeCloseTo(Math.abs(bloque[1] ?? 0), 6);
  });
});
