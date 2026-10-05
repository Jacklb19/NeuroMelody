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

/** Default volume and control range (RF-18). */
export const DEFAULT_VOLUME_DB = -12;
export const MIN_VOLUME_DB = -40;
export const MAX_VOLUME_DB = 0;

/** Limiter at the end of the chain (before the −1 dBFS clipper). */
export const LIMITER = { thresholdDb: -6, ratio: 20, kneeDb: 0, attackS: 0.003, releaseS: 0.25 } as const;

export const FADE_IN_S = 1.5;
/** Stop: ramp to zero in 50 ms and suspend the context (HU-06: silence in under 200 ms). */
export const STOP_RAMP_S = 0.05;
export const FINAL_FADE_S = 20;
const RESTORE_AFTER_CANCEL_S = 2;

/** Everything the engine needs from the environment; injectable to test it without a browser. */
export interface AudioFactory {
  createAudioContext(): AudioContext;
  /** URLs of the AudioWorklet modules (synthesizer and clipper). */
  readonly modules: readonly string[];
  createWorkletNode(context: AudioContext, name: string, options: AudioWorkletNodeOptions): AudioWorkletNode;
  /** `null` without cross-origin isolation: no telemetry. */
  createTelemetryBuffer(): SharedArrayBuffer | null;
  createAudioElement(): HTMLAudioElement;
  wait(ms: number): Promise<void>;
}

export interface EngineOptions {
  readonly seed: number;
  readonly initialLevel: LevelId;
  /**
   * Media Session fallback: the output goes through an `<audio>` element.
   * With it, `playbackStats` no longer measures what is actually heard.
   */
  readonly outputThroughAudioElement: boolean;
}

export type EngineState = 'ready' | 'playing' | 'stopped' | 'closed';

export interface PeakReading {
  readonly blocks: number;
  /** Output peak since the previous reading, in dBFS; `null` without data. */
  readonly peakDbfs: number | null;
}

export interface EngineStats extends PlaybackStatistics {
  /** `false` when the output goes through an `<audio>` and the metric does not reflect what is heard. */
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

/** Holds a parameter at its current value and drops what is scheduled from `t`. */
function hold(param: AudioParam, t: number): number {
  const current = param.value;
  if (typeof param.cancelAndHoldAtTime === 'function') {
    // Preserve the part of an interrupted ramp preceding t on the audio timeline.
    param.cancelAndHoldAtTime(t);
  } else {
    param.cancelScheduledValues(t);
    param.setValueAtTime(current, t);
  }
  return current;
}

/**
 * Session audio graph, on the main thread. It only schedules: values are
 * interpolated on the audio thread by AudioParam automation (ADR-07), so
 * nothing audible depends on timers.
 *
 * synthesizer → low-pass (brightness) → dry + reverb → volume →
 * session envelope → limiter → clipper (−1 dBFS) → output
 */
export class AudioEngine {
  readonly #context: AudioContext;
  readonly #nodes: Nodes;
  readonly #factory: AudioFactory;
  readonly #telemetry: TelemetryReader | null;
  readonly #audioElement: HTMLAudioElement | null;
  #state: EngineState = 'ready';
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

  /** Creates the context, loads the worklet modules and builds the graph (silent). */
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
    getParam(synthesizer, 'mode').value = level.mode;
    getParam(synthesizer, 'layers').value = level.layers;

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

  /** Audio clock time, in seconds: the reference for all timing. */
  get audioTime(): number {
    return this.#context.currentTime;
  }

  get volumeDb(): number {
    return gainToDb(this.#nodes.volume.gain.value);
  }

  get outputThroughAudioElement(): boolean {
    return this.#audioElement !== null;
  }

  /** Resumes the context and raises the session envelope over 1.5 s. */
  async start(): Promise<void> {
    await this.#context.resume();
    if (this.#audioElement !== null) {
      await this.#audioElement.play();
    }
    const t = this.#context.currentTime;
    const envelope = this.#nodes.envelope.gain;
    hold(envelope, t);
    envelope.linearRampToValueAtTime(1, t + FADE_IN_S);
    this.#state = 'playing';
  }

  /**
   * Schedules the gradual transition to a level (RF-10): tempo over
   * max(20 s, |ΔBPM| × 2 s), brightness and reverb over 45 s. The synthesizer
   * applies mode and layers with its 30 s fades.
   *
   * @returns the tempo ramp duration, in seconds.
   */
  applyLevel(id: LevelId): number {
    const level = LEVELS[id];
    const t = this.#context.currentTime;
    const { synthesizer, filter, wet } = this.#nodes;

    const tempo = getParam(synthesizer, 'tempo');
    const from = hold(tempo, t);
    const duration = tempoRampDurationS(from, level.tempo);
    tempo.linearRampToValueAtTime(level.tempo, t + duration);

    hold(getParam(synthesizer, 'mode'), t);
    getParam(synthesizer, 'mode').setValueAtTime(level.mode, t);
    hold(getParam(synthesizer, 'layers'), t);
    getParam(synthesizer, 'layers').setValueAtTime(level.layers, t);

    hold(filter.frequency, t);
    filter.frequency.exponentialRampToValueAtTime(level.brightnessHz, t + TIMBRE_RAMP_DURATION_S);
    hold(wet.gain, t);
    wet.gain.linearRampToValueAtTime(level.reverb, t + TIMBRE_RAMP_DURATION_S);

    this.#level = id;
    return duration;
  }

  /** Sets the volume within −40 to 0 dB and returns the applied value. */
  setVolumeDb(db: number): number {
    const clamped = Math.min(MAX_VOLUME_DB, Math.max(MIN_VOLUME_DB, db));
    // Short time constant: responds immediately without clicks.
    this.#nodes.volume.gain.setTargetAtTime(dbToGain(clamped), this.#context.currentTime, 0.05);
    return clamped;
  }

  /** Immediate stop: ramp to zero in 50 ms and suspend the context. */
  async stop(): Promise<void> {
    if (this.#state !== 'playing') {
      return;
    }
    const t = this.#context.currentTime;
    const envelope = this.#nodes.envelope.gain;
    hold(envelope, t);
    envelope.linearRampToValueAtTime(0, t + STOP_RAMP_S);
    this.#state = 'stopped';
    // The ramp already silences on the audio thread; the wait only avoids cutting it short.
    await this.#factory.wait(STOP_RAMP_S * 1000 + 10);
    this.#audioElement?.pause();
    await this.#context.suspend();
  }

  /**
   * Schedules on the audio clock a 20 s fade starting `inSeconds` from now
   * (end of session without an answer). It happens even when the tab is in
   * the background.
   *
   * @returns the instant (audio clock) at which the fade ends.
   */
  scheduleFinalFade(inSeconds: number): number {
    // Only schedules ahead: it does not cancel the start fade if it is still running.
    const startTime = this.#context.currentTime + Math.max(0, inSeconds);
    const envelope = this.#nodes.envelope.gain;
    envelope.setValueAtTime(1, startTime);
    envelope.linearRampToValueAtTime(0, startTime + FINAL_FADE_S);
    return startTime + FINAL_FADE_S;
  }

  /** Cancels a scheduled final fade and returns to full level over 2 s. */
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

  /** Output peak (after the clipper) since the previous reading. */
  readPeak(): PeakReading | null {
    if (this.#telemetry === null) {
      return null;
    }
    const { blocks, max } = this.#telemetry.read();
    return { blocks, peakDbfs: max === null || max === 0 ? null : gainToDb(max) };
  }

  async close(): Promise<void> {
    this.#audioElement?.pause();
    this.#state = 'closed';
    await this.#context.close();
  }
}
