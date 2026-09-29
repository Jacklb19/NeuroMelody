import { describe, it, expect } from 'vitest';
import {
  TELEMETRY_CAPACITY,
  TelemetryWriter,
  TelemetryReader,
  createTelemetryBuffer,
} from './telemetryRing';

describe('anillo de telemetría', () => {
  it('entrega el máximo y el número de bloques nuevos desde la última lectura', () => {
    const buffer = createTelemetryBuffer();
    const writer = new TelemetryWriter(buffer);
    const reader = new TelemetryReader(buffer);

    expect(reader.read()).toEqual({ blocks: 0, max: null });
    writer.write(0.25);
    writer.write(0.5);
    writer.write(0.125);
    expect(reader.read()).toEqual({ blocks: 3, max: 0.5 });

    writer.write(0.0625);
    expect(reader.read()).toEqual({ blocks: 1, max: 0.0625 });
  });

  it('si el escritor da la vuelta, lee solo los valores más recientes', () => {
    const buffer = createTelemetryBuffer();
    const writer = new TelemetryWriter(buffer);
    const reader = new TelemetryReader(buffer);

    writer.write(0.9); // quedará sobrescrito
    for (let i = 0; i < TELEMETRY_CAPACITY; i++) {
      writer.write(0.5);
    }
    const reading = reader.read();
    expect(reading.blocks).toBe(TELEMETRY_CAPACITY + 1);
    expect(reading.max).toBe(0.5);
  });

  it('lector y escritor comparten la memoria, sin copias', () => {
    const buffer = createTelemetryBuffer();
    new TelemetryWriter(buffer).write(0.75);
    expect(new TelemetryReader(buffer).read().max).toBe(0.75);
  });
});
