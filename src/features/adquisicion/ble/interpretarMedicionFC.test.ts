import { describe, it, expect } from 'vitest';
import { ErrorMedicionFC, interpretarMedicionFC } from './interpretarMedicionFC';

// Vectores construidos según la especificación de la característica
// Heart Rate Measurement (0x2A37) del Bluetooth SIG, en little endian.
function vista(...bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('interpretarMedicionFC', () => {
  it('lee la FC en 8 bits sin campos opcionales', () => {
    expect(interpretarMedicionFC(vista(0x00, 0x48))).toEqual({
      frecuenciaCardiaca: 72,
      contactoSensor: null,
      intervalosRRms: [],
    });
  });

  it('lee la FC en 16 bits little endian', () => {
    expect(interpretarMedicionFC(vista(0x01, 0x4b, 0x00)).frecuenciaCardiaca).toBe(75);
    expect(interpretarMedicionFC(vista(0x01, 0x00, 0x01)).frecuenciaCardiaca).toBe(256);
  });

  it.each([
    [0x00, null],
    [0x02, null], // "detectado" sin "soportado" no tiene significado
    [0x04, false],
    [0x06, true],
  ])('interpreta el contacto del sensor con banderas 0x%s', (banderas, esperado) => {
    expect(interpretarMedicionFC(vista(banderas, 0x48)).contactoSensor).toBe(esperado);
  });

  it('convierte los intervalos RR de 1/1024 s a ms', () => {
    // 0x0400 = 1024 → 1000 ms; 0x0200 = 512 → 500 ms
    expect(interpretarMedicionFC(vista(0x10, 0x48, 0x00, 0x04, 0x00, 0x02)).intervalosRRms).toEqual([
      1000, 500,
    ]);
  });

  it('salta la energía gastada antes de los intervalos RR', () => {
    const medicion = interpretarMedicionFC(vista(0x18, 0x48, 0x10, 0x00, 0x00, 0x04));
    expect(medicion.frecuenciaCardiaca).toBe(72);
    expect(medicion.intervalosRRms).toEqual([1000]);
  });

  it('combina FC de 16 bits, contacto, energía y varios RR', () => {
    const medicion = interpretarMedicionFC(
      vista(0x1f, 0x3c, 0x00, 0x2c, 0x01, 0x00, 0x04, 0x33, 0x03),
    );
    expect(medicion).toEqual({
      frecuenciaCardiaca: 60,
      contactoSensor: true,
      intervalosRRms: [1000, (0x0333 * 1000) / 1024],
    });
  });

  it('acepta la bandera de RR sin intervalos', () => {
    expect(interpretarMedicionFC(vista(0x10, 0x48)).intervalosRRms).toEqual([]);
  });

  it('respeta el desplazamiento de un DataView sobre un búfer mayor', () => {
    const bufer = new Uint8Array([0xff, 0xff, 0x10, 0x48, 0x00, 0x04]).buffer;
    expect(interpretarMedicionFC(new DataView(bufer, 2)).intervalosRRms).toEqual([1000]);
  });

  it.each([
    ['vacía', []],
    ['sin FC de 8 bits', [0x00]],
    ['con FC de 16 bits incompleta', [0x01, 0x48]],
    ['con energía incompleta', [0x08, 0x48, 0x10]],
    ['con RR truncado', [0x10, 0x48, 0x00]],
  ])('rechaza una medición %s', (_caso, bytes) => {
    expect(() => interpretarMedicionFC(vista(...bytes))).toThrow(ErrorMedicionFC);
  });
});
