import { describe, expect, it } from 'vitest';
import type { BeatNotification } from '../acquisition/contract';
import { CALIBRATION_MS } from '../adaptation/rules';
import { MIN_NN_FOR_INDICES_MS } from '../signal/processing/thresholds';
import { MS_PER_SECOND } from '../../shared/time';
import { COLLECTION_STAGE_IDS, nextSubtractionValue, STAGE_SECONDS, SUBTRACTION_START, SUBTRACTION_STEP } from './collectionProtocol';
import {
  buildCollectionExport,
  COLLECTION_EXPORT_FORMAT,
  COLLECTION_SCHEMA_VERSION,
  isCollectionRecording,
  type CollectionRecording,
} from './collectionRecording';
import { MemoryCollectionStore } from './collectionStore';
import { participantCode, PARTICIPANT_STORAGE_KEY } from './participant';
import { StageRecorder } from './StageRecorder';

const beat = (timeMs: number, rrIntervalsMs: readonly number[]): BeatNotification =>
  ({ timeMs, heartRate: 70, rrIntervalsMs, sensorContact: null });

const recording = (overrides: Partial<CollectionRecording> = {}): CollectionRecording => ({
  id: '017f22e2-79b0-7cc3-98c4-dc0c0c07398f',
  participant: '5f0c1d4e-1111-4222-8333-444455556666',
  recordedAt: '2026-10-12T10:00:00.000Z',
  consentAt: '2026-10-12T10:00:00.000Z',
  sourceKind: 'ble',
  segments: COLLECTION_STAGE_IDS.map((label) => ({
    label, plannedSeconds: STAGE_SECONDS[label], beatTimesMs: [800, 1600], rrMs: [800, 800],
  })),
  ...overrides,
});

describe('protocol', () => {
  it('rests long enough to take the baseline of a session and still leave examples', () => {
    expect(STAGE_SECONDS.rest * MS_PER_SECOND).toBeGreaterThan(CALIBRATION_MS + MIN_NN_FOR_INDICES_MS);
    // Every other stage must outlast the minute of beats the first reading needs.
    for (const id of COLLECTION_STAGE_IDS) expect(STAGE_SECONDS[id] * MS_PER_SECOND).toBeGreaterThan(MIN_NN_FOR_INDICES_MS);
  });

  it('counts down by the step and starts over before going below it', () => {
    expect(nextSubtractionValue(SUBTRACTION_START)).toBe(SUBTRACTION_START - SUBTRACTION_STEP);
    expect(nextSubtractionValue(SUBTRACTION_STEP + 1)).toBe(SUBTRACTION_START);
  });
});

describe('StageRecorder', () => {
  it('starts with the first notification and keeps only the intervals that lie whole inside the stage', () => {
    const recorder = new StageRecorder('rest', 3);
    // Signal time is whatever the source says: the stage begins at 10 s and these beats ended before it.
    expect(recorder.add(beat(10_000, [800, 800]))).toBe('recording');
    // The first interval of this notification began at 9 400 ms, before the stage.
    expect(recorder.add(beat(11_000, [800, 800]))).toBe('recording');
    expect(recorder.add(beat(12_000, [1000]))).toBe('recording');
    expect(recorder.elapsedMs).toBe(2000);
    // The stage ends at 13 s: an interval that ends later belongs to what follows.
    expect(recorder.add(beat(13_400, [700, 700]))).toBe('complete');

    expect(recorder.segment()).toEqual({
      label: 'rest',
      plannedSeconds: 3,
      beatTimesMs: [1000, 2000, 2700],
      rrMs: [800, 1000, 700],
    });
    expect(recorder.elapsedMs).toBe(3000);
  });

  it('reports a signal that started over, so the stage is recorded again as one stretch', () => {
    const recorder = new StageRecorder('slow_breathing', 60);
    recorder.add(beat(50_000, []));
    recorder.add(beat(51_000, [900]));
    // A source that reconnects counts its time from zero again.
    expect(recorder.add(beat(1000, [900]))).toBe('interrupted');
  });
});

describe('recordings', () => {
  it('accepts only the whole protocol, in order, with consistent beats', () => {
    expect(isCollectionRecording(recording())).toBe(true);
    const [rest, breathing, task] = recording().segments;
    expect(isCollectionRecording(recording({ segments: [rest, task, breathing].filter((segment) => segment !== undefined) }))).toBe(false);
    expect(isCollectionRecording(recording({ segments: recording().segments.slice(0, 2) }))).toBe(false);
    expect(isCollectionRecording(recording({
      segments: recording().segments.map((segment) => ({ ...segment, rrMs: [800] })),
    }))).toBe(false);
    expect(isCollectionRecording(recording({
      segments: recording().segments.map((segment) => ({ ...segment, beatTimesMs: [1600, 800] })),
    }))).toBe(false);
    expect(isCollectionRecording({ ...recording(), sourceKind: 'watch' })).toBe(false);
    // Beats that are nobody's are not a recording to keep or export.
    expect(isCollectionRecording(recording({ sourceKind: 'simulator' }))).toBe(false);
  });

  it('exports the recordings under the format and version the training code reads', () => {
    const file = buildCollectionExport([recording()], new Date('2026-10-12T12:00:00.000Z'));
    expect(file.format).toBe(COLLECTION_EXPORT_FORMAT);
    expect(file.schemaVersion).toBe(COLLECTION_SCHEMA_VERSION);
    expect(file.exportedAt).toBe('2026-10-12T12:00:00.000Z');
    // Nothing but the recordings: no account, no name.
    expect(Object.keys(file).sort()).toEqual(['exportedAt', 'format', 'recordings', 'schemaVersion']);
    expect(Object.keys(file.recordings[0] ?? {}).sort()).toEqual(['consentAt', 'id', 'participant', 'recordedAt', 'segments', 'sourceKind']);
  });

  it('stores valid recordings, newest first, and refuses anything else', async () => {
    const store = new MemoryCollectionStore();
    await store.save(recording());
    await store.save(recording({ id: '017f22e2-79b0-7cc3-98c4-dc0c0c07398e', recordedAt: '2026-10-13T10:00:00.000Z' }));
    expect((await store.list()).map((item) => item.recordedAt)).toEqual(['2026-10-13T10:00:00.000Z', '2026-10-12T10:00:00.000Z']);
    await expect(store.save(recording({ participant: '' }))).rejects.toThrow();
    await store.delete('017f22e2-79b0-7cc3-98c4-dc0c0c07398f');
    expect(await store.list()).toHaveLength(1);
  });
});

describe('participantCode', () => {
  it('makes one random code per device and reuses it', () => {
    const kept = new Map<string, string>();
    const storage = { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => { kept.set(key, value); } };
    const codes = ['5f0c1d4e-1111-4222-8333-444455556666', 'aaaaaaaa-1111-4222-8333-444455556666'];
    const create = (): string => codes.shift() ?? '';
    const first = participantCode(storage, create);
    expect(participantCode(storage, create)).toBe(first);
    expect(kept.get(PARTICIPANT_STORAGE_KEY)).toBe(first);
    // Storage that was tampered with does not become a code.
    kept.set(PARTICIPANT_STORAGE_KEY, 'ana@example.test');
    expect(participantCode(storage, create)).toBe('aaaaaaaa-1111-4222-8333-444455556666');
  });
});
