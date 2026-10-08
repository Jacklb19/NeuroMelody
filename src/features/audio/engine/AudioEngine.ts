import { MS_PER_SECOND } from '../../../shared/time';
import { dbToGain, gainToDb } from '../core/decibels';
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
import { TIMBRE_RAMP_DURATION_S, tempoRampDurationS } from './ramps';
import { generateImpulseResponse } from './impulseResponse';
import { AudioEngineError } from './AudioEngineError';

/** Default volume, control range and slider step (RF-18). */
export const DEFAULT_VOLUME_DB = -12;
export const MIN_VOLUME_DB = -40;
export const MAX_VOLUME_DB = 0;
export const VOLUME_STEP_DB = 1;
/** Time constant of volume changes: responds immediately without clicks. */
const VOLUME_SMOOTHING_S = 0.05;

/** Limiter at the end of the chain (before the −1 dBFS clipper). */
export const LIMITER = { thresholdDb: -6, ratio: 20, kneeDb: 0, attackS: 0.003, releaseS: 0.25 } as const;
/** Resonance (`Q`) of the brightness low-pass filter. */
const BRIGHTNESS_FILTER_Q = 0.5;
/** The whole chain is stereo. */
const OUTPUT_CHANNELS = 2;

/** Session envelope rise when playback starts or resumes. */
export const SESSION_FADE_IN_S = 1.5;
/** Stop: ramp to zero in 50 ms and suspend the context (HU-06: silence in under 200 ms). */
export const STOP_RAMP_S = 0.05;
/** Extra wait after the stop ramp before suspending, so the ramp is never cut short. */
const STOP_WAIT_MARGIN_MS = 10;
export const FINAL_FADE_S = 20;
const RESTORE_AFTER_CANCEL_S = 2;

/**
 * Media Session fallback through an `<audio>` element: off. Only Web Audio
 * was tested and, if the system shows no controls, the fixed Stop button is
 * enough (minor decisions in docs/decisiones.md).
 */
export const OUTPUT_THROUGH_AUDIO_ELEMENT = false;

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
    throw new AudioEngineError(
      'missing_parameter',
      { parameter: name },
      `The synthesizer does not expose the ${name} parameter.`,
    );
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
      outputChannelCount: [OUTPUT_CHANNELS],
      processorOptions: synthesizerOptions,
    });
    getParam(synthesizer, 'tempo').value = level.tempo;
    getParam(synthesizer, 'mode').value = level.mode;
    getParam(synthesizer, 'layers').value = level.layers;

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = BRIGHTNESS_FILTER_Q;
    filter.frequency.value = level.brightnessHz;

    const reverb = context.createConvolver();
    const [left, right] = generateImpulseResponse(context.sampleRate);
    const response = context.createBuffer(OUTPUT_CHANNELS, left.length, context.sampleRate);
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
      outputChannelCount: [OUTPUT_CHANNELS],
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
    envelope.linearRampToValueAtTime(1, t + SESSION_FADE_IN_S);
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

  /** Tempo currently rendered by the audio timeline, rather than the ramp target. */
  get tempoBpm(): number {
    return getParam(this.#nodes.synthesizer, 'tempo').value;
  }

  /** Sets the volume within −40 to 0 dB and returns the applied value. */
  setVolumeDb(db: number): number {
    const clamped = Math.min(MAX_VOLUME_DB, Math.max(MIN_VOLUME_DB, db));
    this.#nodes.volume.gain.setTargetAtTime(dbToGain(clamped), this.#context.currentTime, VOLUME_SMOOTHING_S);
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
    await this.#factory.wait(STOP_RAMP_S * MS_PER_SECOND + STOP_WAIT_MARGIN_MS);
    // Leaving the page closes the context during the ramp; it is already silent.
    if (this.#context.state === 'closed') return;
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
