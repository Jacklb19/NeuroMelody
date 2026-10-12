import { createRandom } from '../../acquisition/simulator/prng';
import { SECONDS_PER_MINUTE } from '../../../shared/time';
import { FADE_DURATION_S } from '../engine/ramps';
import { BankComposer, TICKS_PER_BEAT } from './composer';
import { BANK_COUNT, LAYER, LAYER_COUNT, MIN_LAYERS } from './layers';
import { sine } from './oscillator';
import { MIDI_DRONE, isMode, midiFrequency, type Mode } from './theory';
import { DRONE_AMPLITUDE, DRONE_PARTIALS } from './timbres';
import { VoicePool, panGain, wrap } from './voices';

export { LAYER_COUNT, MIN_LAYERS } from './layers';
export { MAX_VOICES } from './voices';

/** Beats in a harmonic cycle: mode changes wait for it to close. */
export const BEATS_PER_CYCLE = 16;

/**
 * Offset of the second random sequence, which decides only where a note sits
 * and how hard it is struck. The notes come from the first one, so a change
 * of sound never changes what is played.
 */
const COLOUR_SEED_OFFSET = 0x5bd1e995;

/**
 * Slow cycles that keep a long session from repeating, in seconds: how busy
 * the music is, how high it sits and how open the pad sounds. The periods are
 * primes, so the three never come back to the same combination in a session.
 */
const DENSITY_PERIOD_S = 127;
const LIFT_PERIOD_S = 211;
const TONE_PERIOD_S = 337;
/** Range the overtones of the pad move in, as a factor of what its timbre defines. */
const PAD_TONE_MIN = 0.7;
const PAD_TONE_MAX = 1.2;

/**
 * Layered generative synthesis (RF-08), with no browser dependencies so it
 * can be tested deterministically. The AudioWorklet processor only calls it
 * block by block.
 *
 * Real-time rules: all state is allocated in the constructor and `process`
 * creates no objects or arrays. The sequencer advances with the sample clock,
 * so it does not depend on timers.
 *
 * Layers: 0 drone (a slow-moving stack of D and A), 1 harmony (held chords and
 * the figure above them), 2 melody (phrases). The `layers` parameter (1 to 3)
 * turns layers on in that order, with a 30 s fade. A `mode` change is applied
 * when the harmonic cycle closes, with a 30 s crossfade between two voice
 * banks: each bank has its own composer, and the outgoing one keeps playing
 * its mode until it is silent, so the music never thins out in between.
 *
 * What each mode plays is in `arrangement.ts`, how the notes are chosen in
 * `composer.ts` and how each instrument sounds in `timbres.ts`.
 */
export class SynthesisCore {
  readonly #fs: number;
  readonly #fadeStep: number;
  readonly #voices: VoicePool;
  readonly #composers: readonly BankComposer[];

  // Drone partials: two oscillators and a slow swell each. Phases are in cycles.
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
  /** Position of each bank in its crossfade, from 0 to 1, and the level it is heard at. */
  readonly #bankGain = new Float64Array(BANK_COUNT);
  readonly #bankLevel = new Float64Array(BANK_COUNT);
  readonly #bankStep = new Float64Array(BANK_COUNT);

  /** Where each slow cycle starts, in cycles: different in every session. */
  readonly #densityStart: number;
  readonly #liftStart: number;
  readonly #toneStart: number;
  #samples = 0;

  #tickPhase = 1;
  #tick = -1;
  #currentMode: Mode;
  #pendingMode: Mode;
  #activeBank = 0;

  /**
   * `initialMode` is required: the starting level is decided on the main
   * thread (AudioEngine) and reaches the worklet as processor options, so the
   * core holds no default of its own that could drift from it.
   */
  constructor(sampleRate: number, seed: number, initialMode: Mode) {
    this.#fs = sampleRate;
    this.#fadeStep = 1 / (FADE_DURATION_S * sampleRate);
    this.#currentMode = initialMode;
    this.#pendingMode = initialMode;
    this.#bankGain[0] = 1;
    this.#bankLevel[0] = 1;
    this.#layerGain[LAYER.drone] = 1;
    this.#layerTarget[LAYER.drone] = 1;

    const random = createRandom(seed);
    const colour = createRandom(seed ^ COLOUR_SEED_OFFSET);
    this.#densityStart = colour();
    this.#liftStart = colour();
    this.#toneStart = colour();
    this.#voices = new VoicePool(sampleRate, this.#layerGain, this.#bankLevel);
    this.#composers = Array.from(
      { length: BANK_COUNT },
      (_, bank) => new BankComposer(bank, initialMode, random, colour, this.#voices),
    );

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
      this.#swellPhase[p] = colour();
      this.#swellIncrement[p] = partial.swellHz / sampleRate;
      this.#swellDepth[p] = partial.swellDepth;
    });
  }

  /** Inspection data for tests and telemetry; not part of the sound. */
  get beat(): number {
    return Math.floor(this.#tick / TICKS_PER_BEAT);
  }
  get currentMode(): Mode {
    return this.#currentMode;
  }
  get activeBank(): number {
    return this.#activeBank;
  }
  get voiceSteals(): number {
    return this.#voices.steals;
  }
  /** Voices of a bank that have not finished fading. */
  soundingVoices(bank: number): number {
    return this.#voices.sounding(bank);
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

    const tickAdvance = (tempo * TICKS_PER_BEAT) / (SECONDS_PER_MINUTE * this.#fs);

    for (let n = 0; n < left.length; n++) {
      this.#samples++;
      this.#tickPhase += tickAdvance;
      if (this.#tickPhase >= 1) {
        this.#tickPhase -= 1;
        this.#onTick();
      }
      this.#smoothGains();

      let sumLeft = 0;
      let sumRight = 0;

      // Drone: every partial swells on its own and drifts slowly between the ears.
      const droneGain = this.#layerGain[LAYER.drone] ?? 0;
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

      this.#voices.render();
      left[n] = sumLeft + this.#voices.left;
      right[n] = sumRight + this.#voices.right;
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
      const gain = moveTowards(this.#bankGain[b] ?? 0, target, this.#bankStep[b] ?? 0);
      this.#bankGain[b] = gain;
      // Equal-power curve: halfway through, the two modes together are as loud as either alone.
      this.#bankLevel[b] = Math.sqrt(gain);
    }
  }

  /** A layer keeps being played while it fades out, so the fade is heard on music and not on silence. */
  #heard(layer: number): boolean {
    return (this.#layerTarget[layer] ?? 0) > 0 || (this.#layerGain[layer] ?? 0) > 0;
  }

  #onTick(): void {
    this.#tick++;
    const closesCycle = this.#tick % (BEATS_PER_CYCLE * TICKS_PER_BEAT) === 0;

    if (closesCycle && this.#pendingMode !== this.#currentMode) {
      // The harmonic cycle closes: the crossfade to the new mode starts.
      this.#currentMode = this.#pendingMode;
      this.#activeBank = 1 - this.#activeBank;
      for (let b = 0; b < BANK_COUNT; b++) {
        const target = b === this.#activeBank ? 1 : 0;
        this.#bankStep[b] = Math.abs(target - (this.#bankGain[b] ?? 0)) * this.#fadeStep;
      }
      this.#composers[this.#activeBank]?.start(this.#currentMode);
    }

    // The slow cycles follow the clock, not the beat: a slower tempo does not stretch them.
    const seconds = this.#samples / this.#fs;
    const density = slowCycle(this.#densityStart, seconds, DENSITY_PERIOD_S);
    const lift = slowCycle(this.#liftStart, seconds, LIFT_PERIOD_S);
    this.#voices.padTone =
      PAD_TONE_MIN + (PAD_TONE_MAX - PAD_TONE_MIN) * slowCycle(this.#toneStart, seconds, TONE_PERIOD_S);

    const harmony = this.#heard(LAYER.harmony);
    const melody = this.#heard(LAYER.melody);
    for (let b = 0; b < BANK_COUNT; b++) {
      // The outgoing bank plays on in its own mode until its fade ends.
      if (b === this.#activeBank || (this.#bankGain[b] ?? 0) > 0) {
        this.#composers[b]?.onTick(this.#tick, harmony, melody, density, lift);
      } else {
        this.#composers[b]?.stop();
      }
    }
  }
}

/** Value from 0 to 1 of a sine cycle of `periodS` seconds that began at `start` cycles. */
function slowCycle(start: number, seconds: number, periodS: number): number {
  return 0.5 + 0.5 * sine(start + seconds / periodS);
}

function moveTowards(current: number, target: number, step: number): number {
  if (current < target) {
    return Math.min(target, current + step);
  }
  return Math.max(target, current - step);
}
