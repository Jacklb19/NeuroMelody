import { describe, expect, it } from 'vitest';
import { ContactMonitor } from './contactMonitor';
import { MAX_GAP_MS } from './thresholds';

const beat = (timeMs: number, rrIntervalsMs: number[] = [1000], sensorContact: boolean | null = true) => ({
  timeMs,
  heartRate: 60,
  rrIntervalsMs,
  sensorContact,
});

describe('ContactMonitor', () => {
  it('reports beats flowing while RR intervals keep arriving', () => {
    const monitor = new ContactMonitor();
    expect(monitor.observe(beat(1000))).toBe(true);
    expect(monitor.observe(beat(2000, [], null))).toBe(true);
  });

  it('reports a gap once no RR interval arrived for longer than the maximum gap', () => {
    const monitor = new ContactMonitor();
    monitor.observe(beat(1000));
    expect(monitor.observe(beat(1000 + MAX_GAP_MS, []))).toBe(true);
    expect(monitor.observe(beat(1001 + MAX_GAP_MS, []))).toBe(false);
  });

  it('reports lost contact when the sensor says so', () => {
    expect(new ContactMonitor().observe(beat(1000, [1000], false))).toBe(false);
  });

  it('restarts signal time on reset', () => {
    const monitor = new ContactMonitor();
    monitor.observe(beat(60_000));
    monitor.reset();
    expect(monitor.observe(beat(1000, []))).toBe(true);
  });
});
