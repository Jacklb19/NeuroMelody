import { describe, expect, it } from 'vitest';
import type { EngineDiagnostic } from '../audio/engine/AudioEngine';
import { AudioTrace, MAX_AUDIO_TRACE_ENTRIES } from './audioTrace';

const setup = { output: 'direct', instrument: 'warm', ambience: 'none', userAgent: 'test-browser' } as const;
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
      version: 1, setup, droppedEntries: 0,
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
});
