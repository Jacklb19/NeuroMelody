import { describe, expect, it } from 'vitest';
import type { IndicesResult } from '../signal/processing/SignalProcessor';
import { SessionRecorder } from './SessionRecorder';
import { isSessionRecord } from './sessionRecord';

function indices(timeMs: number, overrides: Partial<IndicesResult> = {}): IndicesResult {
  return {
    timeMs, meanHr: 62, rmssd: 45, sdnn: 40, nnDurationMs: 60_000, coverageMs: timeMs,
    acceptedBeats: 60, discardedBeats: 0, quality: 'good', lfPower: 300, hfPower: 800, lfHfRatio: 0.375,
    ...overrides,
  };
}

const START = { plannedMinutes: 20, sourceKind: 'simulator', ratingBefore: 6 } as const;

describe('SessionRecorder', () => {
  it('ignores indices while no session is running', () => {
    const recorder = new SessionRecorder(() => 0);
    recorder.add(indices(5000), null);
    expect(recorder.finish(0)).toBeNull();
  });

  it('counts seconds from the session start, not from the connection', () => {
    let now = Date.parse('2026-10-07T10:00:00Z');
    const recorder = new SessionRecorder(() => now);
    recorder.start(START);
    recorder.add(indices(300_000), null);
    recorder.add(indices(305_000), 'uncertain');
    now += 600_000;
    const record = recorder.finish(600);

    expect(record?.samples.map((sample) => sample.second)).toEqual([5, 10]);
    expect(record?.samples[1]?.estimatedState).toBe('uncertain');
    expect(record?.startedAt).toBe('2026-10-07T10:00:00.000Z');
    expect(record?.endedAt).toBe('2026-10-07T10:10:00.000Z');
    expect(record?.ratingBefore).toBe(6);
    expect(record?.ratingAfter).toBeNull();
    expect(isSessionRecord(record)).toBe(true);
  });

  it('keeps seconds unique and increasing when the source restarts', () => {
    const recorder = new SessionRecorder(() => 0);
    recorder.start(START);
    for (const timeMs of [5000, 10_000, 15_000, 5000, 10_000]) recorder.add(indices(timeMs), null);
    expect(recorder.finish(30)?.samples.map((sample) => sample.second)).toEqual([5, 10, 15, 20, 25]);
  });

  it('keeps the indices and quality of each sample', () => {
    const recorder = new SessionRecorder(() => 0);
    recorder.start(START);
    recorder.add(indices(5000, { meanHr: null, rmssd: null, sdnn: null, lfHfRatio: null, quality: 'low' }), null);
    expect(recorder.finish(5)?.samples[0]).toEqual({
      second: 5, meanHr: null, rmssd: null, sdnn: null, lfHfRatio: null, estimatedState: null, goodQuality: false,
    });
  });

  it('records the source actually used', () => {
    const recorder = new SessionRecorder(() => 0);
    recorder.start({ ...START, sourceKind: null });
    recorder.setSource('ble');
    expect(recorder.finish(0)?.sourceKind).toBe('ble');
  });
});
