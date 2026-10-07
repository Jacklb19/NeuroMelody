import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createFakeTimeEnvironment } from '../../../test/fakeTimeEnvironment';
import type { BeatNotification } from '../contract';
import { NOTIFICATION_PERIOD_MS } from '../config';
import { RecordedSource } from './RecordedSource';
import { parseRecording, RecordingError } from './recording';
import {
  RECORDING_DURATION_MS,
  RECORDING_IDS,
  RECORDING_SCHEMA_VERSION,
  RECORDINGS_DIRECTORY,
  recordingFileName,
  type RecordingId,
} from './recordingCatalog';

function example(id: RecordingId): unknown {
  return JSON.parse(readFileSync(join('public', RECORDINGS_DIRECTORY, recordingFileName(id)), 'utf8')) as unknown;
}

async function playback(speed: 1 | 10, jump: boolean) {
  const env = createFakeTimeEnvironment();
  const source = new RecordedSource({ recordId: 'nsr001', speed, ...env, load: () => Promise.resolve(example('nsr001')) });
  const notifications: BeatNotification[] = [];
  const errors: Error[] = [];
  source.subscribe({ onNotification: n => notifications.push(n), onError: e => errors.push(e) });
  await source.connect();
  if (jump) env.jump(RECORDING_DURATION_MS / speed); else env.advance(RECORDING_DURATION_MS / speed);
  expect(source.state).toBe('disconnected');
  expect(env.active).toBe(false);
  expect(errors).toEqual([]);
  return notifications;
}

describe('RecordedSource', () => {
  it('validates both bundled examples and rejects corrupt input', () => {
    for (const id of RECORDING_IDS) expect(parseRecording(example(id), id).rrIntervalsMs.length).toBeGreaterThan(1000);
    const header = { schemaVersion: RECORDING_SCHEMA_VERSION, recordId: 'nsr001', durationMs: RECORDING_DURATION_MS };
    for (const [value, code] of [[null, 'invalid_format'], [{}, 'invalid_format'], [{ ...header, rrIntervalsMs: [] }, 'invalid_series'],
      [{ ...header, rrIntervalsMs: [NaN] }, 'invalid_interval'], [{ ...header, rrIntervalsMs: [1000] }, 'duration_mismatch']] as const) {
      expect(() => parseRecording(value, 'nsr001')).toThrow(new RecordingError(code));
    }
    expect(() => parseRecording(example('nsr001'), 'nsr002')).toThrow(RecordingError);
  });
  it('preserves every original RR, signal timestamps, speed invariance and delayed notifications', async () => {
    const reference = await playback(1, false);
    expect(reference.length).toBe(RECORDING_DURATION_MS / NOTIFICATION_PERIOD_MS);
    expect(reference.flatMap(n => n.rrIntervalsMs)).toEqual(parseRecording(example('nsr001'), 'nsr001').rrIntervalsMs);
    expect(await playback(10, false)).toEqual(reference);
    expect(await playback(1, true)).toEqual(reference);
  });
  it('reports download failures and supports retry', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('Network error')).mockResolvedValue(example('nsr002'));
    const env = createFakeTimeEnvironment();
    const source = new RecordedSource({ recordId: 'nsr002', speed: 1, ...env, load });
    const onError = vi.fn();
    source.subscribe({ onError });
    await source.connect();
    expect(source.state).toBe('error');
    expect(onError).toHaveBeenCalledOnce();
    await source.connect();
    expect(source.state).toBe('connected');
    await source.disconnect();
    expect(env.active).toBe(false);
  });
  it('ignores a pending download after disconnecting', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const env = createFakeTimeEnvironment();
    const source = new RecordedSource({ recordId: 'nsr001', speed: 1, ...env,
      load: () => new Promise(resolve => { finish = resolve; }) });
    const connecting = source.connect();
    await source.disconnect();
    finish(example('nsr001'));
    await connecting;
    expect(source.state).toBe('disconnected');
    expect(env.active).toBe(false);
  });
});
