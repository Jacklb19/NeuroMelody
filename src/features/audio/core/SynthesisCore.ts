import { createRandom, type RandomSource } from '../../acquisition/simulator/prng';
import { SECONDS_PER_MINUTE } from '../../../shared/time';
import { FADE_DURATION_S } from '../engine/ramps';
import {
  SCALES,
  MIDI_DRONE,
  MIDI_TONIC,
  MODE,
  SEMITONES_PER_OCTAVE,
  isMode,
  midiFrequency,
  degreeNote,
  type Mode,
} from './theory';

/** Beats in a harmonic cycle: mode changes wait for it to close. */
export const BEATS_PER_CYCLE = 16;
/** How many beats between chord changes in the harmony layer. */
export const BEATS_PER_CHORD = 4;
/** Voices allocated at start; no more are ever created. */
export const MAX_VOICES = 32;
/** Layers the `layers` parameter can turn on: drone, harmony and melody. */
export const LAYER_COUNT = 3;
/** The drone layer always sounds: at least one layer is active. */
export const MIN_LAYERS = 1;
/** Voice banks: the outgoing and the incoming mode of a crossfade. */
const BANK_COUNT = 2;

const MELODY_NOTE_PROBABILITY = 0.35;
/** Amplitude below which a voice is released (≈ −80 dB, inaudible). */
const SILENCE_THRESHOLD = 1e-4;

const LAYER_DRONE = 0;
const LAYER_HARMONY = 1;
const LAYER_MELODY = 2;
const STATE_FREE = 0;
const STATE_ATTACK = 1;
const STATE_DECAY = 2;

interface Envelope {
  readonly amplitude: number;
  readonly attackS: number;
  readonly decayS: number;
}

const CHORD_ENVELOPE: Envelope = { amplitude: 0.07, attackS: 0.8, decayS: 2.5 };
const DYAD_ENVELOPE: Envelope = { amplitude: 0.08, attackS: 2, decayS: 4 };
const MELODY_ENVELOPE: Envelope = { amplitude: 0.09, attackS: 0.02, decayS: 1.2 };
const DRONE_AMPLITUDE = 0.11;
/** Slow amplitude breathing of the drone: gain = 1 − depth + depth · sin(2π · rate · t). */
const DRONE_BREATH_HZ = 0.07;
const DRONE_BREATH_DEPTH = 0.15;
/** The drone sounds with its perfect fifth above, a little softer. */
const FIFTH_SEMITONES = 7;
const FIFTH_GAIN = 0.6;
/** The melody plays one octave above the tonic and spans two octaves of the scale. */
const MELODY_BASE_MIDI = MIDI_TONIC + SEMITONES_PER_OCTAVE;
const MELODY_RANGE_OCTAVES = 2;
/** Scale steps above the root of a triad and, over the drone, of an open dyad. */
const CHORD_MIDDLE_STEP = 2;
const CHORD_TOP_STEP = 4;
const DYAD_TOP_STEP = 3;
/** Level of the second harmonic over the sine: a soft, warm timbre. */
const SECOND_HARMONIC_GAIN = 0.15;

/**
 * Layered generative synthesis (RF-08), with no browser dependencies so it
 * can be tested deterministically. The AudioWorklet processor only calls it
 * block by block.
 *
 * Real-time rules: all state is allocated in the constructor and `process`
 * creates no objects or arrays. The sequencer advances with the sample clock,
 * so it does not depend on timers.
 *
 * Layers: 0 drone (sustained D2 and A2), 1 harmony (chords every 4 beats),
 * 2 melody (sparse notes). The `layers` parameter (1 to 3) turns layers on in
 * that order, with a 30 s fade. A `mode` change is applied when the harmonic
 * cycle closes, with a 30 s crossfade between two voice banks.
 */
export class SynthesisCore {
  readonly #fs: number;
  readonly #random: RandomSource;
  readonly #fadeStep: number;

  // Voices: one array per field, allocated once.
  readonly #phase = new Float64Array(MAX_VOICES);
  readonly #increment = new Float64Array(MAX_VOICES);
  readonly #amplitude = new Float64Array(MAX_VOICES);
  readonly #peak = new Float64Array(MAX_VOICES);
  readonly #attackStep = new Float64Array(MAX_VOICES);
  readonly #decayFactor = new Float64Array(MAX_VOICES);
  readonly #state = new Int8Array(MAX_VOICES);
  readonly #layer = new Int8Array(MAX_VOICES);
  readonly #bank = new Int8Array(MAX_VOICES);

  readonly #layerGain = new Float64Array(LAYER_COUNT);
  readonly #layerTarget = new Float64Array(LAYER_COUNT);
  readonly #layerStep = new Float64Array(LAYER_COUNT);
  readonly #bankGain = new Float64Array(BANK_COUNT);
  readonly #bankStep = new Float64Array(BANK_COUNT);

  #dronePhase = 0;
  #fifthPhase = 0;
  #lifePhase = 0;
  #beatPhase = 1;
  #beat = -1;
  #currentMode: Mode;
  #pendingMode: Mode;
  #activeBank = 0;
  #steals = 0;

  /**
   * `initialMode` is required: the starting level is decided on the main
   * thread (AudioEngine) and reaches the worklet as processor options, so the
   * core holds no default of its own that could drift from it.
   */
  constructor(sampleRate: number, seed: number, initialMode: Mode) {
    this.#fs = sampleRate;
    this.#random = createRandom(seed);
    this.#fadeStep = 1 / (FADE_DURATION_S * sampleRate);
    this.#currentMode = initialMode;
    this.#pendingMode = initialMode;
    this.#bankGain[0] = 1;
    this.#layerGain[LAYER_DRONE] = 1;
    this.#layerTarget[LAYER_DRONE] = 1;
  }

  /** Inspection data for tests and telemetry; not part of the sound. */
  get beat(): number {
    return this.#beat;
  }
  get currentMode(): Mode {
    return this.#currentMode;
  }
  get activeBank(): number {
    return this.#activeBank;
  }
  get voiceSteals(): number {
    return this.#steals;
  }
  bankGain(bank: number): number {
    return this.#bankGain[bank] ?? 0;
  }
  layerGain(layer: number): number {
    return this.#layerGain[layer] ?? 0;
  }

  /**
   * Sets each layer gain without a fade. Only for the first block of a
   * session: the sound starts with the initial level layers already on.
   */
  setInitialLayers(layers: number): void {
    this.#updateLayerTargets(layers);
    this.#layerGain.set(this.#layerTarget);
  }

  /**
   * Synthesizes `output.length` samples with the block parameters.
   *
   * @param tempo Beats per minute.
   * @param mode 0 major pentatonic, 1 lydian, 2 drone with pentatonic.
   * @param layers Number of active layers (1 to 3).
   */
  process(output: Float32Array, tempo: number, mode: number, layers: number): void {
    const roundedMode = Math.round(mode);
    if (isMode(roundedMode)) {
      this.#pendingMode = roundedMode;
    }
    this.#updateLayerTargets(layers);

    const beatAdvance = tempo / (SECONDS_PER_MINUTE * this.#fs);
    const droneIncrement = (2 * Math.PI * midiFrequency(MIDI_DRONE)) / this.#fs;
    const fifthIncrement = (2 * Math.PI * midiFrequency(MIDI_DRONE + FIFTH_SEMITONES)) / this.#fs;
    const lifeIncrement = (2 * Math.PI * DRONE_BREATH_HZ) / this.#fs;

    for (let n = 0; n < output.length; n++) {
      this.#beatPhase += beatAdvance;
      if (this.#beatPhase >= 1) {
        this.#beatPhase -= 1;
        this.#onBeat();
      }
      this.#smoothGains();

      // Sustained drone with a slow amplitude breathing.
      this.#dronePhase += droneIncrement;
      this.#fifthPhase += fifthIncrement;
      this.#lifePhase += lifeIncrement;
      const breathing = 1 - DRONE_BREATH_DEPTH + DRONE_BREATH_DEPTH * Math.sin(this.#lifePhase);
      let sample =
        (this.#layerGain[LAYER_DRONE] ?? 0) *
        DRONE_AMPLITUDE *
        breathing *
        (Math.sin(this.#dronePhase) + FIFTH_GAIN * Math.sin(this.#fifthPhase));

      for (let v = 0; v < MAX_VOICES; v++) {
        if (this.#state[v] !== STATE_FREE) {
          sample += this.#voiceSample(v);
        }
      }
      output[n] = sample;
    }

    // Keeps phases from growing unbounded and losing precision.
    this.#dronePhase %= 2 * Math.PI;
    this.#fifthPhase %= 2 * Math.PI;
    this.#lifePhase %= 2 * Math.PI;
  }

  #updateLayerTargets(layers: number): void {
    const activeLayers = Math.min(LAYER_COUNT, Math.max(MIN_LAYERS, Math.round(layers)));
    for (let c = 0; c < LAYER_COUNT; c++) {
      const target = c < activeLayers ? 1 : 0;
      if (target !== this.#layerTarget[c]) {
        this.#layerTarget[c] = target;
        // A reversal takes a full 30 s even when the previous fade was partial.
        this.#layerStep[c] = Math.abs(target - (this.#layerGain[c] ?? 0)) * this.#fadeStep;
      }
    }
  }

  #smoothGains(): void {
    for (let c = 0; c < LAYER_COUNT; c++) {
      this.#layerGain[c] = moveTowards(this.#layerGain[c] ?? 0, this.#layerTarget[c] ?? 0, this.#layerStep[c] ?? 0);
    }
    for (let b = 0; b < BANK_COUNT; b++) {
      const target = b === this.#activeBank ? 1 : 0;
      this.#bankGain[b] = moveTowards(this.#bankGain[b] ?? 0, target, this.#bankStep[b] ?? 0);
    }
  }

  #onBeat(): void {
    this.#beat++;
    const position = this.#beat % BEATS_PER_CYCLE;

    if (position === 0 && this.#pendingMode !== this.#currentMode) {
      // The harmonic cycle closes: the crossfade to the new mode starts.
      this.#currentMode = this.#pendingMode;
      this.#activeBank = 1 - this.#activeBank;
      for (let b = 0; b < BANK_COUNT; b++) {
        const target = b === this.#activeBank ? 1 : 0;
        this.#bankStep[b] = Math.abs(target - (this.#bankGain[b] ?? 0)) * this.#fadeStep;
      }
    }

    if (position % BEATS_PER_CHORD === 0 && (this.#layerTarget[LAYER_HARMONY] ?? 0) > 0) {
      this.#triggerChord();
    }
    if (
      (this.#layerTarget[LAYER_MELODY] ?? 0) > 0 &&
      this.#random() < MELODY_NOTE_PROBABILITY
    ) {
      const scale = SCALES[this.#currentMode];
      const degree = Math.floor(this.#random() * scale.length * MELODY_RANGE_OCTAVES);
      this.#triggerVoice(degreeNote(scale, degree, MELODY_BASE_MIDI), LAYER_MELODY, MELODY_ENVELOPE);
    }
  }

  #triggerChord(): void {
    const scale = SCALES[this.#currentMode];
    const root = Math.floor(this.#random() * scale.length);
    if (this.#currentMode === MODE.dronePentatonic) {
      // Open dyad over the drone: calmer than a full chord.
      this.#triggerVoice(degreeNote(scale, root, MIDI_TONIC), LAYER_HARMONY, DYAD_ENVELOPE);
      this.#triggerVoice(degreeNote(scale, root + DYAD_TOP_STEP, MIDI_TONIC), LAYER_HARMONY, DYAD_ENVELOPE);
      return;
    }
    // Three explicit calls instead of looping over an array literal: no allocation.
    this.#triggerVoice(degreeNote(scale, root, MIDI_TONIC), LAYER_HARMONY, CHORD_ENVELOPE);
    this.#triggerVoice(degreeNote(scale, root + CHORD_MIDDLE_STEP, MIDI_TONIC), LAYER_HARMONY, CHORD_ENVELOPE);
    this.#triggerVoice(degreeNote(scale, root + CHORD_TOP_STEP, MIDI_TONIC), LAYER_HARMONY, CHORD_ENVELOPE);
  }

  #triggerVoice(midi: number, layer: number, envelope: Envelope): void {
    let chosen = -1;
    let lowest = Number.POSITIVE_INFINITY;
    for (let v = 0; v < MAX_VOICES; v++) {
      if (this.#state[v] === STATE_FREE) {
        chosen = v;
        break;
      }
      const amplitude = this.#amplitude[v] ?? 0;
      if (amplitude < lowest) {
        lowest = amplitude;
        chosen = v;
      }
    }
    if (this.#state[chosen] !== STATE_FREE) {
      this.#steals++;
    }
    this.#phase[chosen] = 0;
    this.#increment[chosen] = (2 * Math.PI * midiFrequency(midi)) / this.#fs;
    this.#amplitude[chosen] = 0;
    this.#peak[chosen] = envelope.amplitude;
    this.#attackStep[chosen] = envelope.amplitude / (envelope.attackS * this.#fs);
    this.#decayFactor[chosen] = Math.exp(-1 / (envelope.decayS * this.#fs));
    this.#state[chosen] = STATE_ATTACK;
    this.#layer[chosen] = layer;
    this.#bank[chosen] = this.#activeBank;
  }

  #voiceSample(v: number): number {
    let amplitude = this.#amplitude[v] ?? 0;
    if (this.#state[v] === STATE_ATTACK) {
      amplitude += this.#attackStep[v] ?? 0;
      if (amplitude >= (this.#peak[v] ?? 0)) {
        amplitude = this.#peak[v] ?? 0;
        this.#state[v] = STATE_DECAY;
      }
    } else {
      amplitude *= this.#decayFactor[v] ?? 0;
      if (amplitude < SILENCE_THRESHOLD) {
        this.#state[v] = STATE_FREE;
        this.#amplitude[v] = 0;
        return 0;
      }
    }
    this.#amplitude[v] = amplitude;

    const phase = (this.#phase[v] ?? 0) + (this.#increment[v] ?? 0);
    this.#phase[v] = phase > 2 * Math.PI ? phase - 2 * Math.PI : phase;
    const gain =
      (this.#layerGain[this.#layer[v] ?? 0] ?? 0) * (this.#bankGain[this.#bank[v] ?? 0] ?? 0);
    // Sine with a little second harmonic: a soft, warm timbre.
    return gain * amplitude * (Math.sin(phase) + SECOND_HARMONIC_GAIN * Math.sin(2 * phase));
  }
}

function moveTowards(current: number, target: number, step: number): number {
  if (current < target) {
    return Math.min(target, current + step);
  }
  return Math.max(target, current - step);
}
