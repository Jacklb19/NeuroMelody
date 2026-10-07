import { describe, it, expect } from 'vitest';
import { HeartRateMeasurementError, parseHeartRateMeasurement } from './parseHeartRateMeasurement';

// Vectors built from the Bluetooth SIG specification of the Heart Rate
// Measurement characteristic (0x2A37), little endian.
function view(...bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('parseHeartRateMeasurement', () => {
  it.each([
    { bytes: [0x16, 0x3c, 0x00, 0x04], heartRate: 60, sensorContact: true, rrIntervalsMs: [1000] },
    { bytes: [0x16, 0x40, 0xc0, 0x03], heartRate: 64, sensorContact: true, rrIntervalsMs: [937.5] },
    { bytes: [0x16, 0x60, 0x80, 0x02], heartRate: 96, sensorContact: true, rrIntervalsMs: [625] },
    { bytes: [0x16, 0x3c, 0x00, 0x04, 0x10, 0x04], heartRate: 60, sensorContact: true, rrIntervalsMs: [1000, 1015.625] },
    { bytes: [0x14, 0x3c, 0x00, 0x04], heartRate: 60, sensorContact: false, rrIntervalsMs: [1000] },
    { bytes: [0x10, 0x3c, 0x00, 0x04], heartRate: 60, sensorContact: null, rrIntervalsMs: [1000] },
  ])('decodes the documented nRF Connect vector $bytes', ({ bytes, ...expected }) => {
    expect(parseHeartRateMeasurement(view(...bytes))).toEqual(expected);
  });
  it('reads an 8-bit heart rate without optional fields', () => {
    expect(parseHeartRateMeasurement(view(0x00, 0x48))).toEqual({
      heartRate: 72,
      sensorContact: null,
      rrIntervalsMs: [],
    });
  });

  it('reads a 16-bit little-endian heart rate', () => {
    expect(parseHeartRateMeasurement(view(0x01, 0x4b, 0x00)).heartRate).toBe(75);
    expect(parseHeartRateMeasurement(view(0x01, 0x00, 0x01)).heartRate).toBe(256);
  });

  it.each([
    [0x00, null],
    [0x02, null], // "detected" without "supported" is meaningless
    [0x04, false],
    [0x06, true],
  ])('interprets sensor contact with flags 0x%s', (flags, expected) => {
    expect(parseHeartRateMeasurement(view(flags, 0x48)).sensorContact).toBe(expected);
  });

  it('converts RR intervals from 1/1024 s to ms', () => {
    // 0x0400 = 1024 → 1000 ms; 0x0200 = 512 → 500 ms
    expect(parseHeartRateMeasurement(view(0x10, 0x48, 0x00, 0x04, 0x00, 0x02)).rrIntervalsMs).toEqual([
      1000, 500,
    ]);
  });

  it('skips the energy expended field before the RR intervals', () => {
    const measurement = parseHeartRateMeasurement(view(0x18, 0x48, 0x10, 0x00, 0x00, 0x04));
    expect(measurement.heartRate).toBe(72);
    expect(measurement.rrIntervalsMs).toEqual([1000]);
  });

  it('combines a 16-bit heart rate, contact, energy and several RR intervals', () => {
    const measurement = parseHeartRateMeasurement(
      view(0x1f, 0x3c, 0x00, 0x2c, 0x01, 0x00, 0x04, 0x33, 0x03),
    );
    expect(measurement).toEqual({
      heartRate: 60,
      sensorContact: true,
      rrIntervalsMs: [1000, (0x0333 * 1000) / 1024],
    });
  });

  it('accepts the RR flag without intervals', () => {
    expect(parseHeartRateMeasurement(view(0x10, 0x48)).rrIntervalsMs).toEqual([]);
  });

  it('honors the offset of a DataView over a larger buffer', () => {
    const buffer = new Uint8Array([0xff, 0xff, 0x10, 0x48, 0x00, 0x04]).buffer;
    expect(parseHeartRateMeasurement(new DataView(buffer, 2)).rrIntervalsMs).toEqual([1000]);
  });

  it.each([
    ['empty', []],
    ['no 8-bit heart rate', [0x00]],
    ['incomplete 16-bit heart rate', [0x01, 0x48]],
    ['incomplete energy expended', [0x08, 0x48, 0x10]],
    ['truncated RR', [0x10, 0x48, 0x00]],
  ])('rejects a malformed measurement (%s)', (_case, bytes) => {
    expect(() => parseHeartRateMeasurement(view(...bytes))).toThrow(HeartRateMeasurementError);
  });
});
