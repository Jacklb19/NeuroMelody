import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { parseHeartRateMeasurement } from './parseHeartRateMeasurement';
import { BeatFilter } from '../../signal/processing/BeatFilter';
import { SignalProcessor, type IndicesResult } from '../../signal/processing/SignalProcessor';

it('decodes the documented variable RR macro and accepts its repeated small variations', () => {
  const document = readFileSync(resolve(process.cwd(), 'docs/prueba-ble.md'), 'utf8');
  const macro = document.match(/<macro name="NeuroMelody variable RR sample"[^>]*>([\s\S]*?)<\/macro>/u)?.[1];
  if (macro === undefined) throw new Error('Missing variable RR macro in the BLE guide');
  const notifications = [...macro.matchAll(/<send-notification\s+service-uuid="([^"]+)"\s+characteristic-uuid="([^"]+)"\s+value="([0-9A-F]+)"\s*\/>/gu)];
  expect(notifications).toHaveLength(8);
  expect([...macro.matchAll(/<sleep timeout="1000"\s*\/>/gu)]).toHaveLength(8);
  const readings = notifications.map(match => {
    expect(match[1]).toBe('0000180d-0000-1000-8000-00805f9b34fb');
    expect(match[2]).toBe('00002a37-0000-1000-8000-00805f9b34fb');
    const hex = match[3];
    if (hex === undefined) throw new Error('Missing notification bytes');
    const bytes = Uint8Array.from(hex.match(/../gu) ?? [], pair => Number.parseInt(pair, 16));
    const reading = parseHeartRateMeasurement(new DataView(bytes.buffer));
    expect(reading.heartRate).toBe(60);
    expect(reading.sensorContact).toBe(true);
    return reading;
  });
  const rr = readings.flatMap(reading => reading.rrIntervalsMs);
  expect(rr).toEqual([1000, 1015.625, 1000, 984.375, 968.75, 984.375, 1015.625, 1031.25]);
  expect(rr.reduce((sum, value) => sum + value, 0)).toBe(8000);
  const filter = new BeatFilter();
  for (let cycle = 0; cycle < 10; cycle++) {
    for (const value of rr) expect(filter.classify(value)).toEqual({ accepted: true, discardReason: null });
  }
  const results: IndicesResult[] = [];
  const processor = new SignalProcessor(result => results.push(result));
  for (let cycle = 0; cycle < 40; cycle++) {
    readings.forEach((reading, index) => {
      processor.process({ ...reading, timeMs: (cycle * 8 + index + 1) * 1000 });
    });
  }
  const result = results.at(-1);
  expect(result?.quality).toBe('good');
  expect(result?.discardedBeats).toBe(0);
  expect(result?.rmssd).toBeGreaterThan(0);
});
