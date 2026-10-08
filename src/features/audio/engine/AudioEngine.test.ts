import { describe, it, expect } from 'vitest';
import { createFakeAudioEnvironment, type FakeNode, type FakeParam } from '../../../test/fakeAudio';
import { TelemetryWriter, createTelemetryBuffer } from '../telemetry/telemetryRing';
import { dbToGain } from '../core/decibels';
import { MODE } from '../core/theory';
import { CLIPPER_NAME, SYNTHESIZER_NAME } from '../worklet/workletContract';
import { FINAL_FADE_S, LIMITER, AudioEngine, SESSION_FADE_IN_S, STOP_RAMP_S, type AudioFactory } from './AudioEngine';
import { AudioEngineError } from './AudioEngineError';
import { TIMBRE_RAMP_DURATION_S } from './ramps';

async function createEngine(outputThroughAudioElement = false, telemetry: SharedArrayBuffer | null = null) {
  const env = createFakeAudioEnvironment(telemetry);
  const engine = await AudioEngine.create(env.factory, {
    seed: 7,
    initialLevel: 'intermediate',
    outputThroughAudioElement,
  });
  const [synthesizer, clipper] = env.worklets;
  if (synthesizer === undefined || clipper === undefined) {
    throw new Error('Worklets were not created');
  }
  const nodesOfKind = (kind: string) => env.context.nodes.filter((n) => n.kind === kind);
  const param = (name: string) => synthesizer.parameters.get(name) as FakeParam;
  const [volume, wet, envelope] = [nodesOfKind('gain')[1], nodesOfKind('gain')[0], nodesOfKind('gain')[2]] as unknown as { gain: FakeParam }[];
  const filter = nodesOfKind('filter')[0] as unknown as { frequency: FakeParam; type: string };
  return { env, engine, synthesizer, clipper, param, volume, wet, envelope, filter, nodesOfKind };
}

/** Walks the graph from a node following its first connection. */
function chain(from: FakeNode): string[] {
  const kinds = [from.kind];
  let current: FakeNode | undefined = from.connections[0];
  while (current !== undefined) {
    kinds.push(current.kind);
    current = current.connections[0];
  }
  return kinds;
}

describe('AudioEngine.create', () => {
  it('loads both worklet modules in order', async () => {
    const { env } = await createEngine();
    expect(env.context.loadedModules).toEqual(['synthesizer.js', 'clipper.js']);
  });

  it('builds the chain synthesizer → brightness → volume → envelope → limiter → clipper → output', async () => {
    const { synthesizer } = await createEngine();
    expect(chain(synthesizer)).toEqual([
      `worklet:${SYNTHESIZER_NAME}`,
      'filter',
      'gain',
      'gain',
      'compressor',
      `worklet:${CLIPPER_NAME}`,
      'destination',
    ]);
  });

  it('also sends the brightness filter to the reverb, which returns to the volume', async () => {
    const { nodesOfKind } = await createEngine();
    const filter = nodesOfKind('filter')[0];
    const convolution = nodesOfKind('convolver')[0];
    expect(filter?.connections.map((n) => n.kind)).toEqual(['gain', 'convolver']);
    expect(chain(convolution as FakeNode).slice(0, 3)).toEqual(['convolver', 'gain', 'gain']);
  });

  it('starts at the calibration level, at −12 dB and silent', async () => {
    const { synthesizer, param, volume, envelope, wet, filter } = await createEngine();
    expect(synthesizer.options.processorOptions).toEqual({
      seed: 7,
      initialMode: MODE.lydian,
      initialLayers: 2,
    });
    expect(synthesizer.options.outputChannelCount).toEqual([2]);
    expect([param('tempo').value, param('mode').value, param('layers').value]).toEqual([66, MODE.lydian, 2]);
    expect(filter.type).toBe('lowpass');
    expect(filter.frequency.value).toBe(3500);
    expect(wet?.gain.value).toBe(0.35);
    expect(volume?.gain.value).toBeCloseTo(dbToGain(-12), 10);
    expect(envelope?.gain.value).toBe(0);
  });

  it('sets the limiter to a −6 dBFS threshold and a 20:1 ratio', async () => {
    const { nodesOfKind } = await createEngine();
    const limiter = nodesOfKind('compressor')[0] as unknown as Record<string, FakeParam>;
    expect(limiter.threshold?.value).toBe(LIMITER.thresholdDb);
    expect(limiter.ratio?.value).toBe(20);
    expect(limiter.knee?.value).toBe(0);
  });

  it('hands the telemetry buffer to the clipper', async () => {
    const buffer = createTelemetryBuffer();
    const { clipper } = await createEngine(false, buffer);
    expect(clipper.options.processorOptions).toEqual({ telemetry: buffer });
  });

  it('fails with a coded error when the synthesizer lacks a parameter', async () => {
    const env = createFakeAudioEnvironment();
    const factory: AudioFactory = {
      ...env.factory,
      createWorkletNode: (context, name, options) => {
        const node = env.factory.createWorkletNode(context, name, options);
        env.worklets.at(-1)?.parameters.delete('tempo');
        return node;
      },
    };
    const creation = AudioEngine.create(factory, { seed: 7, initialLevel: 'intermediate', outputThroughAudioElement: false });
    await expect(creation).rejects.toBeInstanceOf(AudioEngineError);
    await expect(creation).rejects.toMatchObject({ code: 'missing_parameter', params: { parameter: 'tempo' } });
  });
});

describe('AudioEngine in use', () => {
  it('finishes a stop quietly when the context is closed during the stop ramp', async () => {
    const { engine } = await createEngine();
    await engine.start();
    const stopping = engine.stop();
    await engine.close();
    await expect(stopping).resolves.toBeUndefined();
    expect(engine.state).toBe('closed');
  });

  it('start resumes the context and raises the envelope over 1.5 s', async () => {
    const { engine, env, envelope } = await createEngine();
    env.context.currentTime = 2;
    await engine.start();
    expect(env.context.state).toBe('running');
    expect(engine.state).toBe('playing');
    expect(envelope?.gain.last('linear')).toEqual({ kind: 'linear', value: 1, time: 2 + SESSION_FADE_IN_S });
    expect(SESSION_FADE_IN_S).toBe(1.5);
  });

  it('schedules a 20 s tempo ramp from Intermediate to High activation (ΔBPM = 10)', async () => {
    const { engine, env, param } = await createEngine();
    env.context.currentTime = 10;
    const duration = engine.applyLevel('high');
    expect(duration).toBe(20);
    expect(param('tempo').events.slice(-2)).toEqual([
      { kind: 'set', value: 66, time: 10 },
      { kind: 'linear', value: 76, time: 30 },
    ]);
    expect(param('mode').last('set')).toEqual({ kind: 'set', value: MODE.majorPentatonic, time: 10 });
    expect(param('layers').last('set')).toEqual({ kind: 'set', value: 3, time: 10 });
    expect(engine.level).toBe('high');
  });

  it('lengthens the tempo ramp by |ΔBPM| × 2 s: 76 to 59 BPM takes 34 s', async () => {
    const { engine, env, param } = await createEngine();
    param('tempo').value = 76; // as if the previous ramp had finished
    env.context.currentTime = 100;
    expect(engine.applyLevel('target')).toBe(34);
    expect(param('tempo').last('linear')).toEqual({ kind: 'linear', value: 59, time: 134 });
  });

  it('interpolates brightness and reverb over 45 s', async () => {
    const { engine, env, filter, wet } = await createEngine();
    env.context.currentTime = 5;
    engine.applyLevel('target');
    expect(filter.frequency.last('exponential')).toEqual({
      kind: 'exponential',
      value: 2000,
      time: 5 + TIMBRE_RAMP_DURATION_S,
    });
    expect(wet?.gain.last('linear')).toEqual({ kind: 'linear', value: 0.5, time: 50 });
  });

  it('clamps the volume between −40 and 0 dB', async () => {
    const { engine } = await createEngine();
    expect(engine.setVolumeDb(-60)).toBe(-40);
    expect(engine.setVolumeDb(6)).toBe(0);
    expect(engine.setVolumeDb(-20)).toBe(-20);
    expect(engine.volumeDb).toBeCloseTo(-20, 6);
  });

  it('stop ramps to zero in 50 ms and then suspends the context', async () => {
    const { engine, env, envelope } = await createEngine();
    await engine.start();
    env.context.currentTime = 30;
    await engine.stop();
    expect(envelope?.gain.last('linear')).toEqual({ kind: 'linear', value: 0, time: 30 + STOP_RAMP_S });
    expect(env.waits).toEqual([60]);
    expect(env.context.state).toBe('suspended');
    expect(engine.state).toBe('stopped');
  });

  it('stop does nothing when not playing', async () => {
    const { engine, env } = await createEngine();
    await engine.stop();
    expect(env.waits).toEqual([]);
  });

  it('schedules and cancels the final fade on the audio clock', async () => {
    const { engine, env, envelope } = await createEngine();
    await engine.start();
    if (envelope === undefined) {
      throw new Error('Missing envelope');
    }
    envelope.gain.value = 1;
    env.context.currentTime = 600;

    const eventsBefore = envelope.gain.events.length;
    const end = engine.scheduleFinalFade(120);
    expect(end).toBe(600 + 120 + FINAL_FADE_S);
    // Nothing already scheduled is cancelled (the start fade may still be running).
    expect(envelope.gain.events.slice(eventsBefore)).toEqual([
      { kind: 'set', value: 1, time: 720 },
      { kind: 'linear', value: 0, time: 740 },
    ]);

    env.context.currentTime = 650;
    engine.cancelFinalFade();
    expect(envelope.gain.last('cancel')?.time).toBe(650);
    expect(envelope.gain.last('linear')).toEqual({ kind: 'linear', value: 1, time: 652 });
  });

  it('reads playbackStats when available and flags whether it measures the real output', async () => {
    const { engine, env } = await createEngine();
    expect(engine.stats()).toBeNull();
    env.context.playbackStats = { underrunEvents: 2, underrunDuration: 0.01, totalDuration: 60 };
    expect(engine.stats()).toEqual({
      underruns: 2,
      underrunDurationS: 0.01,
      totalDurationS: 60,
      measuringRealOutput: true,
    });
  });

  it('reads the output peak from telemetry, in dBFS', async () => {
    const buffer = createTelemetryBuffer();
    const { engine } = await createEngine(false, buffer);
    const writer = new TelemetryWriter(buffer);
    writer.write(0.5);
    writer.write(0.25);
    const reading = engine.readPeak();
    expect(reading?.blocks).toBe(2);
    expect(reading?.peakDbfs).toBeCloseTo(-6.02, 2);
    expect(engine.readPeak()).toEqual({ blocks: 0, peakDbfs: null });
  });

  it('without telemetry there is no peak reading', async () => {
    const { engine } = await createEngine();
    expect(engine.readPeak()).toBeNull();
  });

  it('close closes the context', async () => {
    const { engine, env } = await createEngine();
    await engine.close();
    expect(env.context.state).toBe('closed');
    expect(engine.state).toBe('closed');
  });
});

describe('Media Session fallback through an <audio> element', () => {
  it('routes the output to a stream played by an <audio> and flags that the metric is not the real one', async () => {
    const { engine, env, clipper } = await createEngine(true);
    expect(clipper.connections.map((n) => n.kind)).toEqual(['stream']);
    expect(env.element.srcObject).toEqual({ id: 'stream' });

    await engine.start();
    expect(env.element.playing).toBe(true);
    env.context.playbackStats = { underrunEvents: 0, underrunDuration: 0, totalDuration: 5 };
    expect(engine.stats()?.measuringRealOutput).toBe(false);
    expect(engine.outputThroughAudioElement).toBe(true);

    await engine.stop();
    expect(env.element.playing).toBe(false);
  });
});
