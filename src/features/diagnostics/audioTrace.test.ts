import { describe, expect, it } from 'vitest';
import type { EngineDiagnostic } from '../audio/engine/AudioEngine';
import { AudioTrace, MAX_AUDIO_TRACE_ENTRIES, clockSummary, type AudioTraceEntry } from './audioTrace';

const setup = { output: 'direct', latency: 'playback', reverb: 'on', instrument: 'warm', ambience: 'none', userAgent: 'test-browser', processors: 8 } as const;
const reading: EngineDiagnostic = {
  contextState: 'running', engineState: 'playing', audioTimeS: 10, sampleRateHz: 48000,
  baseLatencyS: null, outputLatencyS: null, outputThroughAudioElement: false, playback: null,
};

describe('AudioTrace', () => {
  it('keeps unavailable measurements null instead of reporting zero cuts', () => {
    let now = 100;
    const trace = new AudioTrace(() => now);
    trace.begin(setup);
    now += 50;
    trace.capture('hidden', 'hidden', reading);
    expect(JSON.parse(trace.serialize())).toEqual({
      version: 2, setup, droppedEntries: 0,
      clock: { visible: { wallMs: 0, audioMs: 0, ratio: null, slowest: null }, hidden: { wallMs: 0, audioMs: 0, ratio: null, slowest: null } },
      entries: [{ ...reading, elapsedMs: 50, reason: 'hidden', visibility: 'hidden' }],
    });
  });

  it('retains cumulative counters across a hidden interval without inventing intermediate readings', () => {
    let now = 0;
    const trace = new AudioTrace(() => now);
    trace.begin(setup);
    trace.capture('hidden', 'hidden', reading);
    now = 30_000;
    const resumed = { ...reading, audioTimeS: 40, playback: { underruns: 3, underrunDurationS: 0.02, totalDurationS: 40, measuringRealOutput: true } };
    trace.capture('visible', 'visible', resumed);
    const data: unknown = JSON.parse(trace.serialize());
    expect(trace.length).toBe(2);
    expect(data).toMatchObject({ entries: [expect.objectContaining({ visibility: 'hidden' }), expect.objectContaining({ elapsedMs: 30_000, playback: { underruns: 3, underrunDurationS: 0.02, totalDurationS: 40, measuringRealOutput: true } })] });
  });

  it('bounds memory, records dropped readings and resets the next comparison', () => {
    const trace = new AudioTrace(() => 0);
    trace.begin(setup);
    for (let i = 0; i < MAX_AUDIO_TRACE_ENTRIES + 2; i++) trace.capture('sample', 'visible', reading);
    expect(trace.length).toBe(MAX_AUDIO_TRACE_ENTRIES);
    expect(JSON.parse(trace.serialize())).toMatchObject({ droppedEntries: 2 });
    trace.begin({ ...setup, output: 'media' });
    expect(trace.length).toBe(0);
    expect(JSON.parse(trace.serialize())).toMatchObject({ droppedEntries: 0 });
  });

  it('measures how far the audio clock falls behind the wall clock while hidden, skipping paused intervals', () => {
    const at = (elapsedMs: number, audioTimeS: number, visibility: DocumentVisibilityState, contextState: AudioContextState = 'running'): AudioTraceEntry =>
      ({ ...reading, reason: 'sample', elapsedMs, audioTimeS, visibility, contextState });
    const summary = clockSummary([
      at(0, 0, 'visible'), at(10_000, 10, 'hidden'), at(20_000, 19, 'hidden'), at(30_000, 27, 'visible', 'suspended'), at(40_000, 27, 'visible'), at(40_100, 27.1, 'visible'),
    ]);
    expect(summary.visible).toEqual({ wallMs: 10_000, audioMs: 10_000, ratio: 1, slowest: 1 });
    expect(summary.hidden.ratio).toBeCloseTo(0.85);
    expect(summary.hidden.slowest).toBeCloseTo(0.8);
  });
});
