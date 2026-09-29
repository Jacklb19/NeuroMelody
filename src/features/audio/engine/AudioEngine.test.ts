import { describe, it, expect } from 'vitest';
import { createFakeAudioEnvironment, type FakeNode, type FakeParam } from '../../../test/fakeAudio';
import { TelemetryWriter, createTelemetryBuffer } from '../telemetry/telemetryRing';
import { MODE } from '../core/theory';
import { CLIPPER_NAME, SYNTHESIZER_NAME } from '../worklet/workletContract';
import { FINAL_FADE_S, LIMITER, AudioEngine, STOP_RAMP_S } from './AudioEngine';
import { TIMBRE_RAMP_DURATION_S, dbToGain } from './ramps';

async function createEngine(outputThroughAudioElement = false, telemetry: SharedArrayBuffer | null = null) {
  const env = createFakeAudioEnvironment(telemetry);
  const engine = await AudioEngine.create(env.factory, {
    seed: 7,
    initialLevel: 'intermediate',
    outputThroughAudioElement,
  });
  const [synthesizer, clipper] = env.worklets;
  if (synthesizer === undefined || clipper === undefined) {
    throw new Error('No se crearon los worklets');
  }
  const nodesOfKind = (kind: string) => env.context.nodes.filter((n) => n.kind === kind);
  const param = (name: string) => synthesizer.parameters.get(name) as FakeParam;
  const [volume, wet, envelope] = [nodesOfKind('gain')[1], nodesOfKind('gain')[0], nodesOfKind('gain')[2]] as unknown as { gain: FakeParam }[];
  const filter = nodesOfKind('filter')[0] as unknown as { frequency: FakeParam; type: string };
  return { env, engine, synthesizer, clipper, param, volume, wet, envelope, filter, nodesOfKind };
}

/** Recorre el grafo desde un nodo siguiendo la primera conexión. */
function chain(from: FakeNode): string[] {
  const kinds = [from.kind];
  let current: FakeNode | undefined = from.connections[0];
  while (current !== undefined) {
    kinds.push(current.kind);
    current = current.connections[0];
  }
  return kinds;
}

describe('MotorAudio.crear', () => {
  it('carga los dos módulos del worklet en orden', async () => {
    const { env } = await createEngine();
    expect(env.context.loadedModules).toEqual(['synthesizer.js', 'clipper.js']);
  });

  it('arma la cadena sintetizador → brillo → volumen → envolvente → limitador → recorte → salida', async () => {
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

  it('manda el brillo también a la reverberación, que vuelve al volumen', async () => {
    const { nodesOfKind } = await createEngine();
    const filter = nodesOfKind('filter')[0];
    const convolution = nodesOfKind('convolver')[0];
    expect(filter?.connections.map((n) => n.kind)).toEqual(['gain', 'convolver']);
    expect(chain(convolution as FakeNode).slice(0, 3)).toEqual(['convolver', 'gain', 'gain']);
  });

  it('empieza en el nivel de calibración, con volumen de −12 dB y en silencio', async () => {
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

  it('configura el limitador con umbral −6 dBFS y relación 20:1', async () => {
    const { nodesOfKind } = await createEngine();
    const limiter = nodesOfKind('compressor')[0] as unknown as Record<string, FakeParam>;
    expect(limiter.threshold?.value).toBe(LIMITER.thresholdDb);
    expect(limiter.ratio?.value).toBe(20);
    expect(limiter.knee?.value).toBe(0);
  });

  it('entrega la telemetría al recortador', async () => {
    const buffer = createTelemetryBuffer();
    const { clipper } = await createEngine(false, buffer);
    expect(clipper.options.processorOptions).toEqual({ telemetry: buffer });
  });
});

describe('MotorAudio en uso', () => {
  it('iniciar reanuda el contexto y sube la envolvente en 1,5 s', async () => {
    const { engine, env, envelope } = await createEngine();
    env.context.currentTime = 2;
    await engine.start();
    expect(env.context.state).toBe('running');
    expect(engine.state).toBe('playing');
    expect(envelope?.gain.last('linear')).toEqual({ kind: 'linear', value: 1, time: 3.5 });
  });

  it('programa una rampa de tempo de 20 s de Intermedio a Activación alta (ΔBPM = 10)', async () => {
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

  it('alarga la rampa de tempo según |ΔBPM| × 2 s: de 76 a 59 BPM dura 34 s', async () => {
    const { engine, env, param } = await createEngine();
    param('tempo').value = 76; // como si la rampa anterior hubiera terminado
    env.context.currentTime = 100;
    expect(engine.applyLevel('target')).toBe(34);
    expect(param('tempo').last('linear')).toEqual({ kind: 'linear', value: 59, time: 134 });
  });

  it('interpola brillo y reverberación en 45 s', async () => {
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

  it('acota el volumen entre −40 y 0 dB', async () => {
    const { engine } = await createEngine();
    expect(engine.setVolumeDb(-60)).toBe(-40);
    expect(engine.setVolumeDb(6)).toBe(0);
    expect(engine.setVolumeDb(-20)).toBe(-20);
    expect(engine.volumeDb).toBeCloseTo(-20, 6);
  });

  it('detener baja a cero en 50 ms y después pausa el contexto', async () => {
    const { engine, env, envelope } = await createEngine();
    await engine.start();
    env.context.currentTime = 30;
    await engine.stop();
    expect(envelope?.gain.last('linear')).toEqual({ kind: 'linear', value: 0, time: 30 + STOP_RAMP_S });
    expect(env.waits).toEqual([60]);
    expect(env.context.state).toBe('suspended');
    expect(engine.state).toBe('stopped');
  });

  it('detener no hace nada si no está sonando', async () => {
    const { engine, env } = await createEngine();
    await engine.stop();
    expect(env.waits).toEqual([]);
  });

  it('programa y cancela el fundido final en el reloj de audio', async () => {
    const { engine, env, envelope } = await createEngine();
    await engine.start();
    if (envelope === undefined) {
      throw new Error('Falta la envolvente');
    }
    envelope.gain.value = 1;
    env.context.currentTime = 600;

    const eventsBefore = envelope.gain.events.length;
    const end = engine.scheduleFinalFade(120);
    expect(end).toBe(600 + 120 + FINAL_FADE_S);
    // No cancela nada de lo ya programado (el fundido de entrada puede seguir en curso).
    expect(envelope.gain.events.slice(eventsBefore)).toEqual([
      { kind: 'set', value: 1, time: 720 },
      { kind: 'linear', value: 0, time: 740 },
    ]);

    env.context.currentTime = 650;
    engine.cancelFinalFade();
    expect(envelope.gain.last('cancel')?.time).toBe(650);
    expect(envelope.gain.last('linear')).toEqual({ kind: 'linear', value: 1, time: 652 });
  });

  it('lee playbackStats cuando existe y marca si mide la salida real', async () => {
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

  it('lee el pico de salida desde la telemetría, en dBFS', async () => {
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

  it('sin telemetría no hay lectura de pico', async () => {
    const { engine } = await createEngine();
    expect(engine.readPeak()).toBeNull();
  });

  it('cerrar cierra el contexto', async () => {
    const { engine, env } = await createEngine();
    await engine.close();
    expect(env.context.state).toBe('closed');
    expect(engine.state).toBe('closed');
  });
});

describe('respaldo de Media Session por un elemento <audio>', () => {
  it('envía la salida a un flujo que reproduce un <audio> y avisa que la métrica no es la real', async () => {
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
