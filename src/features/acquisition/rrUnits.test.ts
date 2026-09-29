import { describe, it, expect } from 'vitest';
import { cuantizarRRms, msDesdeUnidadesRR } from './rrUnits';

describe('unidades RR de BLE (1/1024 s)', () => {
  it('convierte unidades a milisegundos', () => {
    expect(msDesdeUnidadesRR(1024)).toBe(1000);
    expect(msDesdeUnidadesRR(512)).toBe(500);
    expect(msDesdeUnidadesRR(1)).toBe(0.9765625);
  });

  it('cuantiza al múltiplo de 1/1024 s más cercano', () => {
    expect(cuantizarRRms(1000)).toBe(1000);
    // 800 ms = 819,2 unidades → 819 unidades = 799,8046875 ms
    expect(cuantizarRRms(800)).toBe(799.8046875);
  });
});
