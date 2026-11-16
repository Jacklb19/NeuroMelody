import { describe, expect, it } from 'vitest';
import type { BeatNotification } from '../acquisition/contract';
import { CALIBRATION_MS, MIN_BASELINE_READINGS } from '../adaptation/rules';
import { PULSE_TRACE_WINDOW_MS, PulseTraceBuffer, pulseTracePath, referenceProgress } from './beatTrace';

const note = (timeMs: number, rrIntervalsMs: readonly number[], heartRate = 60, sensorContact: boolean | null = true): BeatNotification =>
  ({ timeMs, heartRate, rrIntervalsMs, sensorContact });

describe('PulseTraceBuffer', () => {
  it('turns each interval into a beat that ends where the next one began', () => {
    const trace = new PulseTraceBuffer();
    trace.push(note(2000, [1000, 500]));
    // 1000 ms is 60 per minute and ends at 1500; 500 ms is 120 per minute and ends at the notification.
    expect(trace.points).toEqual([{ timeMs: 1500, bpm: 60 }, { timeMs: 2000, bpm: 120 }]);
  });

  it('leaves impossible intervals out of the line but keeps the times of the others', () => {
    const trace = new PulseTraceBuffer();
    trace.push(note(5000, [1000, 150, 2500, 800]));
    expect(trace.points).toEqual([{ timeMs: 1550, bpm: 60 }, { timeMs: 5000, bpm: 75 }]);
  });

  it('keeps only the last minute of signal', () => {
    const trace = new PulseTraceBuffer();
    for (let ms = 1000; ms <= PULSE_TRACE_WINDOW_MS + 10_000; ms += 1000) trace.push(note(ms, [1000]));
    const times = trace.points.map((point) => point.timeMs);
    expect(times[0]).toBe(10_000);
    expect(times.at(-1)).toBe(PULSE_TRACE_WINDOW_MS + 10_000);
  });

  it('draws one point per notification for a watch that sends only the pulse (ADR-51)', () => {
    const trace = new PulseTraceBuffer();
    trace.push(note(1000, [], 64));
    trace.push(note(2000, [], 66));
    expect(trace.points).toEqual([{ timeMs: 1000, bpm: 64 }, { timeMs: 2000, bpm: 66 }]);
  });

  it('does not mix the reported pulse into a beat-to-beat line, nor add anything without contact', () => {
    const trace = new PulseTraceBuffer();
    trace.push(note(1000, [1000]));
    expect(trace.push(note(2000, [], 70))).toBe(false);
    expect(trace.push(note(3000, [1000], 60, false))).toBe(false);
    expect(trace.points).toHaveLength(1);
  });

  it('starts again empty when cleared', () => {
    const trace = new PulseTraceBuffer();
    trace.push(note(1000, [1000]));
    trace.clear();
    trace.push(note(500, [], 70));
    expect(trace.points).toEqual([{ timeMs: 500, bpm: 70 }]);
  });
});

describe('pulseTracePath', () => {
  it('needs two points to draw a line', () => {
    expect(pulseTracePath([{ timeMs: 0, bpm: 60 }], 300, 80)).toBe('');
  });

  it('puts the newest beat on the right edge and a higher pulse higher', () => {
    const path = pulseTracePath([{ timeMs: 0, bpm: 60 }, { timeMs: PULSE_TRACE_WINDOW_MS, bpm: 72 }], 300, 80);
    // The window spans the whole width; 12 per minute is exactly the smallest span, so the ends touch the edges.
    expect(path).toBe('M0.0 80.0 L300.0 0.0');
  });

  it('spreads the first seconds across the box, then moves along with a whole window', () => {
    expect(pulseTracePath([{ timeMs: 1000, bpm: 60 }, { timeMs: 2000, bpm: 60 }], 300, 80)).toBe('M0.0 40.0 L300.0 40.0');
    const long = pulseTracePath([
      { timeMs: 0, bpm: 60 }, { timeMs: PULSE_TRACE_WINDOW_MS / 2, bpm: 60 }, { timeMs: PULSE_TRACE_WINDOW_MS * 1.5, bpm: 60 },
    ], 300, 80);
    // Points older than the window would fall left of the box; the buffer has already dropped them in use.
    expect(long.endsWith('L300.0 40.0')).toBe(true);
  });

  it('does not stretch a steady pulse over the whole height', () => {
    const path = pulseTracePath([{ timeMs: 0, bpm: 60 }, { timeMs: 1000, bpm: 61 }], 300, 80);
    const ys = [...path.matchAll(/ (\d+\.\d)/g)].map((match) => Number(match[1]));
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(10);
  });
});

describe('referenceProgress', () => {
  it('follows the slower of time and readings, since the baseline needs both (ADR-12)', () => {
    const halfway = referenceProgress({ calibrated: false, baselineReadings: MIN_BASELINE_READINGS, signalTimeMs: CALIBRATION_MS / 2 });
    expect(halfway).toMatchObject({ elapsedS: 90, totalS: 180, readings: MIN_BASELINE_READINGS, done: false, share: 0.5 });
    const fewReadings = referenceProgress({ calibrated: false, baselineReadings: 3, signalTimeMs: CALIBRATION_MS });
    expect(fewReadings.share).toBe(3 / MIN_BASELINE_READINGS);
  });

  it('never goes past the whole span and is complete once calibrated', () => {
    const done = referenceProgress({ calibrated: true, baselineReadings: 40, signalTimeMs: CALIBRATION_MS * 2 });
    expect(done).toMatchObject({ elapsedS: 180, readings: MIN_BASELINE_READINGS, done: true, share: 1 });
  });
});
