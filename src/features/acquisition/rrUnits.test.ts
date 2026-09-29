import { describe, it, expect } from 'vitest';
import { quantizeRrMs, msFromRrUnits } from './rrUnits';

describe('unidades RR de BLE (1/1024 s)', () => {
  it('convierte unidades a milisegundos', () => {
    expect(msFromRrUnits(1024)).toBe(1000);
    expect(msFromRrUnits(512)).toBe(500);
    expect(msFromRrUnits(1)).toBe(0.9765625);
  });

  it('cuantiza al múltiplo de 1/1024 s más cercano', () => {
    expect(quantizeRrMs(1000)).toBe(1000);
    // 800 ms = 819,2 unidades → 819 unidades = 799,8046875 ms
    expect(quantizeRrMs(800)).toBe(799.8046875);
  });
});
