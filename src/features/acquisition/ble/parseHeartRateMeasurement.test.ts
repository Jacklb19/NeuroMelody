import { describe, it, expect } from 'vitest';
import { HeartRateMeasurementError, parseHeartRateMeasurement } from './parseHeartRateMeasurement';

// Vectores construidos según la especificación de la característica
// Heart Rate Measurement (0x2A37) del Bluetooth SIG, en little endian.
function view(...bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('interpretarMedicionFC', () => {
  it('lee la FC en 8 bits sin campos opcionales', () => {
    expect(parseHeartRateMeasurement(view(0x00, 0x48))).toEqual({
      heartRate: 72,
      sensorContact: null,
      rrIntervalsMs: [],
    });
  });

  it('lee la FC en 16 bits little endian', () => {
    expect(parseHeartRateMeasurement(view(0x01, 0x4b, 0x00)).heartRate).toBe(75);
    expect(parseHeartRateMeasurement(view(0x01, 0x00, 0x01)).heartRate).toBe(256);
  });

  it.each([
    [0x00, null],
    [0x02, null], // "detectado" sin "soportado" no tiene significado
    [0x04, false],
    [0x06, true],
  ])('interpreta el contacto del sensor con banderas 0x%s', (flags, expected) => {
    expect(parseHeartRateMeasurement(view(flags, 0x48)).sensorContact).toBe(expected);
  });

  it('convierte los intervalos RR de 1/1024 s a ms', () => {
    // 0x0400 = 1024 → 1000 ms; 0x0200 = 512 → 500 ms
    expect(parseHeartRateMeasurement(view(0x10, 0x48, 0x00, 0x04, 0x00, 0x02)).rrIntervalsMs).toEqual([
      1000, 500,
    ]);
  });

  it('salta la energía gastada antes de los intervalos RR', () => {
    const measurement = parseHeartRateMeasurement(view(0x18, 0x48, 0x10, 0x00, 0x00, 0x04));
    expect(measurement.heartRate).toBe(72);
    expect(measurement.rrIntervalsMs).toEqual([1000]);
  });

  it('combina FC de 16 bits, contacto, energía y varios RR', () => {
    const measurement = parseHeartRateMeasurement(
      view(0x1f, 0x3c, 0x00, 0x2c, 0x01, 0x00, 0x04, 0x33, 0x03),
    );
    expect(measurement).toEqual({
      heartRate: 60,
      sensorContact: true,
      rrIntervalsMs: [1000, (0x0333 * 1000) / 1024],
    });
  });

  it('acepta la bandera de RR sin intervalos', () => {
    expect(parseHeartRateMeasurement(view(0x10, 0x48)).rrIntervalsMs).toEqual([]);
  });

  it('respeta el desplazamiento de un DataView sobre un búfer mayor', () => {
    const buffer = new Uint8Array([0xff, 0xff, 0x10, 0x48, 0x00, 0x04]).buffer;
    expect(parseHeartRateMeasurement(new DataView(buffer, 2)).rrIntervalsMs).toEqual([1000]);
  });

  it.each([
    ['vacía', []],
    ['sin FC de 8 bits', [0x00]],
    ['con FC de 16 bits incompleta', [0x01, 0x48]],
    ['con energía incompleta', [0x08, 0x48, 0x10]],
    ['con RR truncado', [0x10, 0x48, 0x00]],
  ])('rechaza una medición %s', (_case, bytes) => {
    expect(() => parseHeartRateMeasurement(view(...bytes))).toThrow(HeartRateMeasurementError);
  });
});
