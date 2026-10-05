import { describe, it, expect } from 'vitest';
import {
  TELEMETRY_CAPACITY,
  TelemetryWriter,
  TelemetryReader,
  createTelemetryBuffer,
} from './telemetryRing';

describe('telemetry ring', () => {
  it('returns the maximum and the number of new blocks since the last read', () => {
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

  it('if the writer wraps around, only the most recent values are read', () => {
    const buffer = createTelemetryBuffer();
    const writer = new TelemetryWriter(buffer);
    const reader = new TelemetryReader(buffer);

    writer.write(0.9); // will be overwritten
    for (let i = 0; i < TELEMETRY_CAPACITY; i++) {
      writer.write(0.5);
    }
    const reading = reader.read();
    expect(reading.blocks).toBe(TELEMETRY_CAPACITY + 1);
    expect(reading.max).toBe(0.5);
  });

  it('reader and writer share memory, without copies', () => {
    const buffer = createTelemetryBuffer();
    new TelemetryWriter(buffer).write(0.75);
    expect(new TelemetryReader(buffer).read().max).toBe(0.75);
  });
});
