import { createRandom, type RandomSource } from '../../acquisition/simulator/prng';
import { SECONDS_PER_MINUTE } from '../../../shared/time';
import { FADE_DURATION_S } from '../engine/ramps';
import { sine } from './oscillator';
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
import {
  BRIGHTNESS_REFERENCE_HZ,
  CHORD_TIMBRE,
  DRONE_AMPLITUDE,
  DRONE_PARTIALS,
  DYAD_TIMBRE,
  MELODY_TIMBRE,
  type Timbre,
} from './timbres';

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

/** The melody plays one octave above the tonic and spans two octaves of the scale. */
const MELODY_BASE_MIDI = MIDI_TONIC + SEMITONES_PER_OCTAVE;
const MELODY_RANGE_OCTAVES = 2;
/** Scale steps above the root of a triad and, over the drone, of an open dyad. */
const CHORD_MIDDLE_STEP = 2;
const CHORD_TOP_STEP = 4;
const DYAD_TOP_STEP = 3;

/** Stereo places of the notes of a chord, from −1 (left) to 1 (right): low, middle and top. */
const CHORD_PAN_LOW = -0.4;
const CHORD_PAN_MIDDLE = 0.1;
const CHORD_PAN_TOP = 0.4;
/** Melody notes fall at random within this distance of the centre. */
const MELODY_PAN_RANGE = 0.35;
/**
 * Offset of the second random sequence, which decides only where a note sits
 * and how it shimmers. The notes come from the first one, so a change of
 * sound never changes what is played.
 */
const COLOUR_SEED_OFFSET = 0x5bd1e995;

/**
 * Layered generative synthesis (RF-08), with no browser dependencies so it
 * can be tested deterministically. The AudioWorklet processor only calls it
 * block by block.
 *
 * Real-time rules: all state is allocated in the constructor and `process`
 * creates no objects or arrays. The sequencer advances with the sample clock,
 * so it does not depend on timers.
 *
 * Layers: 0 drone (a slow-moving stack of D and A), 1 harmony (chords every 4
 * beats), 2 melody (sparse notes). The `layers` parameter (1 to 3) turns
 * layers on in that order, with a 30 s fade. A `mode` change is applied when
 * the harmonic cycle closes, with a 30 s crossfade between two voice banks.
 * The output is stereo; how each instrument sounds is defined in `timbres.ts`.
 */
export class SynthesisCore {
  readonly #fs: number;
  readonly #random: RandomSource;
  readonly #colour: RandomSource;
  readonly #fadeStep: number;

  // Voices: one array per field, allocated once. Phases are in cycles.
  readonly #phaseA = new Float64Array(MAX_VOICES);
  readonly #phaseB = new Float64Array(MAX_VOICES);
  readonly #phaseModulator = new Float64Array(MAX_VOICES);
  readonly #incrementA = new Float64Array(MAX_VOICES);
  readonly #incrementB = new Float64Array(MAX_VOICES);
  readonly #incrementModulator = new Float64Array(MAX_VOICES);
  readonly #amplitude = new Float64Array(MAX_VOICES);
  readonly #peak = new Float64Array(MAX_VOICES);
  readonly #attackStep = new Float64Array(MAX_VOICES);
  readonly #decayFactor = new Float64Array(MAX_VOICES);
  /** Modulation depth, in cycles, of a faded note and what the peak adds to it. */
  readonly #indexBody = new Float64Array(MAX_VOICES);
  readonly #indexRange = new Float64Array(MAX_VOICES);
  readonly #gainALeft = new Float64Array(MAX_VOICES);
  readonly #gainARight = new Float64Array(MAX_VOICES);
  readonly #gainBLeft = new Float64Array(MAX_VOICES);
  readonly #gainBRight = new Float64Array(MAX_VOICES);
  readonly #state = new Int8Array(MAX_VOICES);
  readonly #layer = new Int8Array(MAX_VOICES);
  readonly #bank = new Int8Array(MAX_VOICES);

  // Drone partials: two oscillators and a slow swell each.
  readonly #dronePhaseA = new Float64Array(DRONE_PARTIALS.length);
  readonly #dronePhaseB = new Float64Array(DRONE_PARTIALS.length);
  readonly #droneIncrementA = new Float64Array(DRONE_PARTIALS.length);
  readonly #droneIncrementB = new Float64Array(DRONE_PARTIALS.length);
  readonly #droneGainALeft = new Float64Array(DRONE_PARTIALS.length);
  readonly #droneGainARight = new Float64Array(DRONE_PARTIALS.length);
  readonly #droneGainBLeft = new Float64Array(DRONE_PARTIALS.length);
  readonly #droneGainBRight = new Float64Array(DRONE_PARTIALS.length);
  readonly #swellPhase = new Float64Array(DRONE_PARTIALS.length);
  readonly #swellIncrement = new Float64Array(DRONE_PARTIALS.length);
  readonly #swellDepth = new Float64Array(DRONE_PARTIALS.length);

  readonly #layerGain = new Float64Array(LAYER_COUNT);
  readonly #layerTarget = new Float64Array(LAYER_COUNT);
  readonly #layerStep = new Float64Array(LAYER_COUNT);
  readonly #bankGain = new Float64Array(BANK_COUNT);
  readonly #bankStep = new Float64Array(BANK_COUNT);

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
    this.#colour = createRandom(seed ^ COLOUR_SEED_OFFSET);
    this.#fadeStep = 1 / (FADE_DURATION_S * sampleRate);
    this.#currentMode = initialMode;
    this.#pendingMode = initialMode;
    this.#bankGain[0] = 1;
    this.#layerGain[LAYER_DRONE] = 1;
    this.#layerTarget[LAYER_DRONE] = 1;

    DRONE_PARTIALS.forEach((partial, p) => {
      const frequency = midiFrequency(MIDI_DRONE + partial.semitones);
      this.#droneIncrementA[p] = (frequency - partial.beatHz / 2) / sampleRate;
      this.#droneIncrementB[p] = (frequency + partial.beatHz / 2) / sampleRate;
      const level = DRONE_AMPLITUDE * partial.gain;
      this.#droneGainALeft[p] = level * panGain(-partial.width, false);
      this.#droneGainARight[p] = level * panGain(-partial.width, true);
      this.#droneGainBLeft[p] = level * panGain(partial.width, false);
      this.#droneGainBRight[p] = level * panGain(partial.width, true);
      // Each session starts the swells at a different point of their cycles.
      this.#swellPhase[p] = this.#colour();
      this.#swellIncrement[p] = partial.swellHz / sampleRate;
      this.#swellDepth[p] = partial.swellDepth;
    });
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
   * Synthesizes one block in stereo with the block parameters. `left` and
   * `right` have the same length; passing the same buffer twice is allowed
   * and leaves the right channel in it.
   *
   * @param tempo Beats per minute.
   * @param mode 0 major pentatonic, 1 lydian, 2 drone with pentatonic.
   * @param layers Number of active layers (1 to 3).
   */
  process(left: Float32Array, right: Float32Array, tempo: number, mode: number, layers: number): void {
    const roundedMode = Math.round(mode);
    if (isMode(roundedMode)) {
      this.#pendingMode = roundedMode;
    }
    this.#updateLayerTargets(layers);

    const beatAdvance = tempo / (SECONDS_PER_MINUTE * this.#fs);

    for (let n = 0; n < left.length; n++) {
      this.#beatPhase += beatAdvance;
      if (this.#beatPhase >= 1) {
        this.#beatPhase -= 1;
        this.#onBeat();
      }
      this.#smoothGains();

      let sumLeft = 0;
      let sumRight = 0;

      // Drone: every partial swells on its own and drifts slowly between the ears.
      const droneGain = this.#layerGain[LAYER_DRONE] ?? 0;
      for (let p = 0; p < DRONE_PARTIALS.length; p++) {
        const phaseA = wrap((this.#dronePhaseA[p] ?? 0) + (this.#droneIncrementA[p] ?? 0));
        const phaseB = wrap((this.#dronePhaseB[p] ?? 0) + (this.#droneIncrementB[p] ?? 0));
        const swellPhase = wrap((this.#swellPhase[p] ?? 0) + (this.#swellIncrement[p] ?? 0));
        this.#dronePhaseA[p] = phaseA;
        this.#dronePhaseB[p] = phaseB;
        this.#swellPhase[p] = swellPhase;
        const depth = this.#swellDepth[p] ?? 0;
        const swell = droneGain * (1 - depth + depth * sine(swellPhase));
        const a = sine(phaseA);
        const b = sine(phaseB);
        sumLeft += swell * (a * (this.#droneGainALeft[p] ?? 0) + b * (this.#droneGainBLeft[p] ?? 0));
        sumRight += swell * (a * (this.#droneGainARight[p] ?? 0) + b * (this.#droneGainBRight[p] ?? 0));
      }

      for (let v = 0; v < MAX_VOICES; v++) {
        if (this.#state[v] === STATE_FREE) {
          continue;
        }
        const peak = this.#peak[v] ?? 0;
        let amplitude = this.#amplitude[v] ?? 0;
        if (this.#state[v] === STATE_ATTACK) {
          amplitude += this.#attackStep[v] ?? 0;
          if (amplitude >= peak) {
            amplitude = peak;
            this.#state[v] = STATE_DECAY;
          }
        } else {
          amplitude *= this.#decayFactor[v] ?? 0;
          if (amplitude < SILENCE_THRESHOLD) {
            this.#state[v] = STATE_FREE;
            this.#amplitude[v] = 0;
            continue;
          }
        }
        this.#amplitude[v] = amplitude;

        const phaseA = wrap((this.#phaseA[v] ?? 0) + (this.#incrementA[v] ?? 0));
        const phaseB = wrap((this.#phaseB[v] ?? 0) + (this.#incrementB[v] ?? 0));
        const phaseModulator = wrap((this.#phaseModulator[v] ?? 0) + (this.#incrementModulator[v] ?? 0));
        this.#phaseA[v] = phaseA;
        this.#phaseB[v] = phaseB;
        this.#phaseModulator[v] = phaseModulator;

        // Overtones follow the square of the loudness: bright when struck, mellow in the tail.
        const loudness = amplitude / peak;
        const bend =
          sine(phaseModulator) * ((this.#indexBody[v] ?? 0) + (this.#indexRange[v] ?? 0) * loudness * loudness);
        const a = sine(phaseA + bend);
        const b = sine(phaseB + bend);
        const gain =
          amplitude * (this.#layerGain[this.#layer[v] ?? 0] ?? 0) * (this.#bankGain[this.#bank[v] ?? 0] ?? 0);
        sumLeft += gain * (a * (this.#gainALeft[v] ?? 0) + b * (this.#gainBLeft[v] ?? 0));
        sumRight += gain * (a * (this.#gainARight[v] ?? 0) + b * (this.#gainBRight[v] ?? 0));
      }
      left[n] = sumLeft;
      right[n] = sumRight;
    }
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
      const pan = (this.#colour() * 2 - 1) * MELODY_PAN_RANGE;
      this.#triggerVoice(degreeNote(scale, degree, MELODY_BASE_MIDI), LAYER_MELODY, MELODY_TIMBRE, pan);
    }
  }

  #triggerChord(): void {
    const scale = SCALES[this.#currentMode];
    const root = Math.floor(this.#random() * scale.length);
    if (this.#currentMode === MODE.dronePentatonic) {
      // Open dyad over the drone: calmer than a full chord.
      this.#triggerVoice(degreeNote(scale, root, MIDI_TONIC), LAYER_HARMONY, DYAD_TIMBRE, CHORD_PAN_LOW);
      this.#triggerVoice(
        degreeNote(scale, root + DYAD_TOP_STEP, MIDI_TONIC),
        LAYER_HARMONY,
        DYAD_TIMBRE,
        CHORD_PAN_TOP,
      );
      return;
    }
    // Three explicit calls instead of looping over an array literal: no allocation.
    this.#triggerVoice(degreeNote(scale, root, MIDI_TONIC), LAYER_HARMONY, CHORD_TIMBRE, CHORD_PAN_LOW);
    this.#triggerVoice(
      degreeNote(scale, root + CHORD_MIDDLE_STEP, MIDI_TONIC),
      LAYER_HARMONY,
      CHORD_TIMBRE,
      CHORD_PAN_MIDDLE,
    );
    this.#triggerVoice(
      degreeNote(scale, root + CHORD_TOP_STEP, MIDI_TONIC),
      LAYER_HARMONY,
      CHORD_TIMBRE,
      CHORD_PAN_TOP,
    );
  }

  /** Starts a note. `pan` is its place between the left (−1) and the right (1). */
  #triggerVoice(midi: number, layer: number, timbre: Timbre, pan: number): void {
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
    const frequency = midiFrequency(midi);
    // Every oscillator starts at phase zero: the note begins without a click.
    this.#phaseA[chosen] = 0;
    this.#phaseB[chosen] = 0;
    this.#phaseModulator[chosen] = 0;
    this.#incrementA[chosen] = (frequency - timbre.detuneHz) / this.#fs;
    this.#incrementB[chosen] = (frequency + timbre.detuneHz) / this.#fs;
    this.#incrementModulator[chosen] = frequency / this.#fs;
    this.#amplitude[chosen] = 0;
    this.#peak[chosen] = timbre.amplitude;
    this.#attackStep[chosen] = timbre.amplitude / (timbre.attackS * this.#fs);
    this.#decayFactor[chosen] = Math.exp(-1 / (timbre.decayS * this.#fs));
    const softening = Math.min(1, Math.sqrt(BRIGHTNESS_REFERENCE_HZ / frequency)) / (2 * Math.PI);
    this.#indexBody[chosen] = timbre.body * softening;
    this.#indexRange[chosen] = (timbre.brightness - timbre.body) * softening;
    this.#gainALeft[chosen] = panGain(pan - timbre.width / 2, false);
    this.#gainARight[chosen] = panGain(pan - timbre.width / 2, true);
    this.#gainBLeft[chosen] = panGain(pan + timbre.width / 2, false);
    this.#gainBRight[chosen] = panGain(pan + timbre.width / 2, true);
    this.#state[chosen] = STATE_ATTACK;
    this.#layer[chosen] = layer;
    this.#bank[chosen] = this.#activeBank;
  }
}

function moveTowards(current: number, target: number, step: number): number {
  if (current < target) {
    return Math.min(target, current + step);
  }
  return Math.max(target, current - step);
}

/** Keeps an advancing phase, in cycles, within [0, 1) so it never loses precision. */
function wrap(phase: number): number {
  return phase >= 1 ? phase - 1 : phase;
}

/** Equal-power gain of one channel for a place between the left (−1) and the right (1). */
function panGain(position: number, right: boolean): number {
  const angle = ((Math.min(1, Math.max(-1, position)) + 1) * Math.PI) / 4;
  return right ? Math.sin(angle) : Math.cos(angle);
}
