import { TelemetryReader } from '../telemetry/telemetryRing';
import {
  CLIPPER_NAME,
  SYNTHESIZER_NAME,
  type ParamName,
  type ClipperOptions,
  type SynthesizerOptions,
} from '../worklet/workletContract';
import { readPlaybackStats, type PlaybackStatistics } from './playbackStats';
import { LEVELS, type LevelId } from './levels';
import { TIMBRE_RAMP_DURATION_S, dbToGain, tempoRampDurationS, gainToDb } from './ramps';
import { generateImpulseResponse } from './impulseResponse';

/** Volumen por omisión y rango del control (RF-18). */
export const DEFAULT_VOLUME_DB = -12;
export const MIN_VOLUME_DB = -40;
export const MAX_VOLUME_DB = 0;

/** Limitador al final de la cadena (antes del recorte de −1 dBFS). */
export const LIMITER = { thresholdDb: -6, ratio: 20, kneeDb: 0, attackS: 0.003, releaseS: 0.25 } as const;

export const FADE_IN_S = 1.5;
/** Detener: rampa a cero en 50 ms y pausa del contexto (HU-06: silencio en menos de 200 ms). */
export const STOP_RAMP_S = 0.05;
export const FINAL_FADE_S = 20;
const RESTORE_AFTER_CANCEL_S = 2;

/** Todo lo que el motor necesita del entorno; inyectable para probarlo sin navegador. */
export interface AudioFactory {
  createAudioContext(): AudioContext;
  /** URLs de los módulos del AudioWorklet (sintetizador y recortador). */
  readonly modules: readonly string[];
  createWorkletNode(context: AudioContext, name: string, options: AudioWorkletNodeOptions): AudioWorkletNode;
  /** `null` sin aislamiento de origen cruzado: no hay telemetría. */
  createTelemetryBuffer(): SharedArrayBuffer | null;
  createAudioElement(): HTMLAudioElement;
  wait(ms: number): Promise<void>;
}

export interface EngineOptions {
  readonly seed: number;
  readonly initialLevel: LevelId;
  /**
   * Respaldo para Media Session: la salida pasa por un elemento `<audio>`.
   * Con él, `playbackStats` deja de medir lo que realmente suena.
   */
  readonly outputThroughAudioElement: boolean;
}

export type EngineState = 'listo' | 'sonando' | 'detenido' | 'cerrado';

export interface PeakReading {
  readonly blocks: number;
  /** Pico de la salida desde la lectura anterior, en dBFS; `null` sin datos. */
  readonly peakDbfs: number | null;
}

export interface EngineStats extends PlaybackStatistics {
  /** `false` si la salida va por un `<audio>` y la métrica no refleja lo que suena. */
  readonly measuringRealOutput: boolean;
}

interface Nodes {
  readonly synthesizer: AudioWorkletNode;
  readonly filter: BiquadFilterNode;
  readonly wet: GainNode;
  readonly volume: GainNode;
  readonly envelope: GainNode;
}

function getParam(node: AudioWorkletNode, name: ParamName): AudioParam {
  const param = node.parameters.get(name);
  if (param === undefined) {
    throw new Error(`El sintetizador no expone el parámetro ${name}.`);
  }
  return param;
}

/** Deja un parámetro en su valor actual y descarta lo programado desde `t`. */
function hold(param: AudioParam, t: number): number {
  const current = param.value;
  param.cancelScheduledValues(t);
  param.setValueAtTime(current, t);
  return current;
}

/**
 * Grafo de audio de la sesión, en el hilo principal. Solo programa: los
 * valores se interpolan en el hilo de audio con la automatización de
 * AudioParam (ADR-07), así que nada sonoro depende de temporizadores.
 *
 * sintetizador → pasa bajos (brillo) → seco + reverberación → volumen →
 * envolvente de sesión → limitador → recorte (−1 dBFS) → salida
 */
export class AudioEngine {
  readonly #context: AudioContext;
  readonly #nodes: Nodes;
  readonly #factory: AudioFactory;
  readonly #telemetry: TelemetryReader | null;
  readonly #audioElement: HTMLAudioElement | null;
  #state: EngineState = 'listo';
  #level: LevelId;

  private constructor(
    context: AudioContext,
    nodes: Nodes,
    factory: AudioFactory,
    telemetry: SharedArrayBuffer | null,
    audioElement: HTMLAudioElement | null,
    level: LevelId,
  ) {
    this.#context = context;
    this.#nodes = nodes;
    this.#factory = factory;
    this.#telemetry = telemetry === null ? null : new TelemetryReader(telemetry);
    this.#audioElement = audioElement;
    this.#level = level;
  }

  /** Crea el contexto, carga los módulos del worklet y arma el grafo (en silencio). */
  static async create(factory: AudioFactory, options: EngineOptions): Promise<AudioEngine> {
    const context = factory.createAudioContext();
    for (const moduleUrl of factory.modules) {
      await context.audioWorklet.addModule(moduleUrl);
    }
    const level = LEVELS[options.initialLevel];

    const synthesizerOptions: SynthesizerOptions = {
      seed: options.seed,
      initialMode: level.mode,
      initialLayers: level.layers,
    };
    const synthesizer = factory.createWorkletNode(context, SYNTHESIZER_NAME, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: synthesizerOptions,
    });
    getParam(synthesizer, 'tempo').value = level.tempo;
    getParam(synthesizer, 'modo').value = level.mode;
    getParam(synthesizer, 'capas').value = level.layers;

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    filter.frequency.value = level.brightnessHz;

    const reverb = context.createConvolver();
    const [left, right] = generateImpulseResponse(context.sampleRate);
    const response = context.createBuffer(2, left.length, context.sampleRate);
    response.copyToChannel(left, 0);
    response.copyToChannel(right, 1);
    reverb.buffer = response;

    const wet = context.createGain();
    wet.gain.value = level.reverb;
    const volume = context.createGain();
    volume.gain.value = dbToGain(DEFAULT_VOLUME_DB);
    const envelope = context.createGain();
    envelope.gain.value = 0;

    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = LIMITER.thresholdDb;
    limiter.ratio.value = LIMITER.ratio;
    limiter.knee.value = LIMITER.kneeDb;
    limiter.attack.value = LIMITER.attackS;
    limiter.release.value = LIMITER.releaseS;

    const telemetry = factory.createTelemetryBuffer();
    const clipperOptions: ClipperOptions = { telemetry };
    const clipper = factory.createWorkletNode(context, CLIPPER_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: clipperOptions,
    });

    synthesizer.connect(filter);
    filter.connect(volume);
    filter.connect(reverb);
    reverb.connect(wet);
    wet.connect(volume);
    volume.connect(envelope);
    envelope.connect(limiter);
    limiter.connect(clipper);

    let audioElement: HTMLAudioElement | null = null;
    if (options.outputThroughAudioElement) {
      const streamDestination = context.createMediaStreamDestination();
      clipper.connect(streamDestination);
      audioElement = factory.createAudioElement();
      audioElement.srcObject = streamDestination.stream;
    } else {
      clipper.connect(context.destination);
    }

    return new AudioEngine(
      context,
      { synthesizer, filter, wet, volume, envelope },
      factory,
      telemetry,
      audioElement,
      options.initialLevel,
    );
  }

  get state(): EngineState {
    return this.#state;
  }

  get level(): LevelId {
    return this.#level;
  }

  /** Tiempo del reloj de audio, en segundos: la referencia de toda la temporización. */
  get audioTime(): number {
    return this.#context.currentTime;
  }

  get volumeDb(): number {
    return gainToDb(this.#nodes.volume.gain.value);
  }

  get outputThroughAudioElement(): boolean {
    return this.#audioElement !== null;
  }

  /** Reanuda el contexto y sube la envolvente de sesión en 1,5 s. */
  async start(): Promise<void> {
    await this.#context.resume();
    if (this.#audioElement !== null) {
      await this.#audioElement.play();
    }
    const t = this.#context.currentTime;
    const envelope = this.#nodes.envelope.gain;
    hold(envelope, t);
    envelope.linearRampToValueAtTime(1, t + FADE_IN_S);
    this.#state = 'sonando';
  }

  /**
   * Programa la transición gradual hacia un nivel (RF-10): tempo en
   * máx(20 s, |ΔBPM| × 2 s), brillo y reverberación en 45 s. El modo y las
   * capas los aplica el sintetizador con sus fundidos de 30 s.
   *
   * @returns la duración de la rampa de tempo, en segundos.
   */
  applyLevel(id: LevelId): number {
    const level = LEVELS[id];
    const t = this.#context.currentTime;
    const { synthesizer, filter, wet } = this.#nodes;

    const tempo = getParam(synthesizer, 'tempo');
    const from = hold(tempo, t);
    const duration = tempoRampDurationS(from, level.tempo);
    tempo.linearRampToValueAtTime(level.tempo, t + duration);

    hold(getParam(synthesizer, 'modo'), t);
    getParam(synthesizer, 'modo').setValueAtTime(level.mode, t);
    hold(getParam(synthesizer, 'capas'), t);
    getParam(synthesizer, 'capas').setValueAtTime(level.layers, t);

    hold(filter.frequency, t);
    filter.frequency.exponentialRampToValueAtTime(level.brightnessHz, t + TIMBRE_RAMP_DURATION_S);
    hold(wet.gain, t);
    wet.gain.linearRampToValueAtTime(level.reverb, t + TIMBRE_RAMP_DURATION_S);

    this.#level = id;
    return duration;
  }

  /** Fija el volumen dentro de −40 a 0 dB y devuelve el valor aplicado. */
  setVolumeDb(db: number): number {
    const clamped = Math.min(MAX_VOLUME_DB, Math.max(MIN_VOLUME_DB, db));
    // Constante de tiempo corta: responde de inmediato sin chasquidos.
    this.#nodes.volume.gain.setTargetAtTime(dbToGain(clamped), this.#context.currentTime, 0.05);
    return clamped;
  }

  /** Detención inmediata: rampa a cero en 50 ms y pausa del contexto. */
  async stop(): Promise<void> {
    if (this.#state !== 'sonando') {
      return;
    }
    const t = this.#context.currentTime;
    const envelope = this.#nodes.envelope.gain;
    hold(envelope, t);
    envelope.linearRampToValueAtTime(0, t + STOP_RAMP_S);
    this.#state = 'detenido';
    // La rampa ya silencia en el hilo de audio; la espera solo evita cortarla.
    await this.#factory.wait(STOP_RAMP_S * 1000 + 10);
    this.#audioElement?.pause();
    await this.#context.suspend();
  }

  /**
   * Programa en el reloj de audio un fundido de 20 s que empieza dentro de
   * `enSegundos` (fin de sesión sin respuesta). Ocurre aunque la pestaña esté
   * en segundo plano.
   *
   * @returns el instante (reloj de audio) en que termina el fundido.
   */
  scheduleFinalFade(inSeconds: number): number {
    // Solo agenda a futuro: no cancela el fundido de entrada si aún está en curso.
    const startTime = this.#context.currentTime + Math.max(0, inSeconds);
    const envelope = this.#nodes.envelope.gain;
    envelope.setValueAtTime(1, startTime);
    envelope.linearRampToValueAtTime(0, startTime + FINAL_FADE_S);
    return startTime + FINAL_FADE_S;
  }

  /** Cancela un fundido final programado y vuelve al volumen pleno en 2 s. */
  cancelFinalFade(): void {
    const t = this.#context.currentTime;
    const envelope = this.#nodes.envelope.gain;
    hold(envelope, t);
    envelope.linearRampToValueAtTime(1, t + RESTORE_AFTER_CANCEL_S);
  }

  stats(): EngineStats | null {
    const readStats = readPlaybackStats(this.#context);
    return readStats === null ? null : { ...readStats, measuringRealOutput: this.#audioElement === null };
  }

  /** Pico de la salida (tras el recorte) desde la lectura anterior. */
  readPeak(): PeakReading | null {
    if (this.#telemetry === null) {
      return null;
    }
    const { blocks, max } = this.#telemetry.read();
    return { blocks, peakDbfs: max === null || max === 0 ? null : gainToDb(max) };
  }

  async close(): Promise<void> {
    this.#audioElement?.pause();
    this.#state = 'cerrado';
    await this.#context.close();
  }
}
