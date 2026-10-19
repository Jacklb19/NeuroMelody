import { sine } from './oscillator';
import { midiFrequency } from './theory';
import { BRIGHTNESS_REFERENCE_HZ, type Timbre } from './timbres';

/** Voices allocated at start; no more are ever created. */
export const MAX_VOICES = 48;
/** Amplitude below which a voice is released (≈ −80 dB, inaudible). */
const SILENCE_THRESHOLD = 1e-4;

const STATE_FREE = 0;
const STATE_ATTACK = 1;
const STATE_DECAY = 2;
/** Chosen but not yet sounding: a note may start a few milliseconds after it is decided. */
const STATE_WAITING = 3;

/** Stereo places of the notes of a held chord, from its lowest note up (−1 left, 1 right). */
const CHORD_PANS = [-0.5, 0.2, -0.15, 0.5] as const;
/** The notes of a chord enter this far apart, from the lowest up, like a slowly rolled chord. */
const CHORD_ROLL_S = 0.045;
/** A struck chord is rolled a little wider, as a hand plays it on a piano or strikes a row of bowls. */
const STRUCK_ROLL_S = 0.07;

/** Where the composer sends the notes it decides; the voice pool sounds them. */
export interface NoteSink {
  /**
   * Starts a note that rings and fades on its own.
   *
   * @param pan Place between the left (−1) and the right (1).
   * @param velocity How hard it is struck, from 0 to 1: softer notes are also mellower.
   * @param delayS Seconds to wait before it sounds, so notes do not all fall exactly on the grid.
   */
  strike(
    midi: number,
    timbre: Timbre,
    pan: number,
    velocity: number,
    delayS: number,
    layer: number,
    bank: number,
  ): void;
  /**
   * Holds a chord until the next one. Notes the previous chord of the bank
   * already holds keep sounding untouched; the others are let go.
   *
   * @param notes Semitones above `baseMidi`, from the lowest note up.
   */
  holdChord(notes: readonly number[], baseMidi: number, timbre: Timbre, layer: number, bank: number): void;
  /** Lets go of every held note of a bank. */
  releaseChord(bank: number): void;
  /**
   * Strikes the notes of a chord, rolled from the lowest up; they ring and
   * fade on their own, like a piano or a bowl (ADR-46).
   */
  strikeChord(notes: readonly number[], baseMidi: number, timbre: Timbre, velocity: number, layer: number, bank: number): void;
}

/**
 * The voices of the synthesizer: a fixed pool that sounds the notes it is
 * given, one sample at a time, in stereo.
 *
 * Real-time rules: every array is allocated in the constructor and no method
 * creates objects, so all of them are safe inside `process()`.
 */
export class VoicePool implements NoteSink {
  readonly #fs: number;
  readonly #layerGain: Float64Array;
  readonly #bankLevel: Float64Array;

  // One array per field. Phases are in cycles.
  readonly #phaseA = new Float64Array(MAX_VOICES);
  readonly #phaseB = new Float64Array(MAX_VOICES);
  readonly #phaseModulator = new Float64Array(MAX_VOICES);
  readonly #incrementA = new Float64Array(MAX_VOICES);
  readonly #incrementB = new Float64Array(MAX_VOICES);
  readonly #incrementModulator = new Float64Array(MAX_VOICES);
  readonly #amplitude = new Float64Array(MAX_VOICES);
  readonly #peak = new Float64Array(MAX_VOICES);
  readonly #attackStep = new Float64Array(MAX_VOICES);
  /** Level the amplitude falls towards after the peak: the sustain of a held note, zero otherwise. */
  readonly #floor = new Float64Array(MAX_VOICES);
  readonly #decayFactor = new Float64Array(MAX_VOICES);
  readonly #releaseFactor = new Float64Array(MAX_VOICES);
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
  readonly #note = new Int16Array(MAX_VOICES);
  /** 1 while the voice is a chord note that has not been let go. */
  readonly #held = new Int8Array(MAX_VOICES);
  /** Samples a waiting voice still has to wait. */
  readonly #delay = new Int32Array(MAX_VOICES);

  #steals = 0;

  /** The last sample rendered. */
  left = 0;
  right = 0;
  /**
   * Scales the overtones of the held notes: the owner moves it slowly around
   * 1 so the pad opens and closes over minutes instead of staying fixed.
   */
  padTone = 1;

  /**
   * `layerGain` and `bankLevel` are read on every sample: the owner fades them
   * and the pool applies them to each voice by its layer and its bank.
   */
  constructor(sampleRate: number, layerGain: Float64Array, bankLevel: Float64Array) {
    this.#fs = sampleRate;
    this.#layerGain = layerGain;
    this.#bankLevel = bankLevel;
  }

  /** Notes that had to replace one still sounding because the pool was full. */
  get steals(): number {
    return this.#steals;
  }

  /** Voices of a bank that have not finished fading. */
  sounding(bank: number): number {
    let count = 0;
    for (let v = 0; v < MAX_VOICES; v++) {
      if (this.#state[v] !== STATE_FREE && this.#bank[v] === bank) {
        count++;
      }
    }
    return count;
  }

  strike(
    midi: number,
    timbre: Timbre,
    pan: number,
    velocity: number,
    delayS: number,
    layer: number,
    bank: number,
  ): void {
    this.#start(midi, timbre, pan, velocity, delayS, layer, bank, false);
  }

  holdChord(notes: readonly number[], baseMidi: number, timbre: Timbre, layer: number, bank: number): void {
    for (let v = 0; v < MAX_VOICES; v++) {
      if (this.#held[v] !== 1 || this.#bank[v] !== bank) {
        continue;
      }
      let kept = false;
      for (let i = 0; i < notes.length; i++) {
        kept ||= baseMidi + (notes[i] ?? 0) === this.#note[v];
      }
      if (!kept) {
        this.#release(v);
      }
    }
    for (let i = 0; i < notes.length; i++) {
      const midi = baseMidi + (notes[i] ?? 0);
      if (!this.#holds(midi, bank)) {
        this.#start(midi, timbre, CHORD_PANS[i % CHORD_PANS.length] ?? 0, 1, i * CHORD_ROLL_S, layer, bank, true);
      }
    }
  }

  strikeChord(notes: readonly number[], baseMidi: number, timbre: Timbre, velocity: number, layer: number, bank: number): void {
    for (let i = 0; i < notes.length; i++) {
      const pan = CHORD_PANS[i % CHORD_PANS.length] ?? 0;
      this.#start(baseMidi + (notes[i] ?? 0), timbre, pan, velocity, i * STRUCK_ROLL_S, layer, bank, false);
    }
  }

  releaseChord(bank: number): void {
    for (let v = 0; v < MAX_VOICES; v++) {
      if (this.#held[v] === 1 && this.#bank[v] === bank) {
        this.#release(v);
      }
    }
  }

  /** Advances every voice by one sample and leaves the mix in `left` and `right`. */
  render(): void {
    let sumLeft = 0;
    let sumRight = 0;
    for (let v = 0; v < MAX_VOICES; v++) {
      if (this.#state[v] === STATE_FREE) {
        continue;
      }
      if (this.#state[v] === STATE_WAITING) {
        const delay = (this.#delay[v] ?? 0) - 1;
        this.#delay[v] = delay;
        if (delay <= 0) {
          this.#state[v] = STATE_ATTACK;
        }
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
        const floor = this.#floor[v] ?? 0;
        amplitude = floor + (amplitude - floor) * (this.#decayFactor[v] ?? 0);
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
      const tone = this.#held[v] === 1 ? this.padTone : 1;
      const bend =
        sine(phaseModulator) * tone * ((this.#indexBody[v] ?? 0) + (this.#indexRange[v] ?? 0) * loudness * loudness);
      const a = sine(phaseA + bend);
      const b = sine(phaseB + bend);
      const gain = amplitude * (this.#layerGain[this.#layer[v] ?? 0] ?? 0) * (this.#bankLevel[this.#bank[v] ?? 0] ?? 0);
      sumLeft += gain * (a * (this.#gainALeft[v] ?? 0) + b * (this.#gainBLeft[v] ?? 0));
      sumRight += gain * (a * (this.#gainARight[v] ?? 0) + b * (this.#gainBRight[v] ?? 0));
    }
    this.left = sumLeft;
    this.right = sumRight;
  }

  #holds(midi: number, bank: number): boolean {
    for (let v = 0; v < MAX_VOICES; v++) {
      if (this.#held[v] === 1 && this.#bank[v] === bank && this.#note[v] === midi) {
        return true;
      }
    }
    return false;
  }

  /** Lets a held note fade from wherever its envelope is, without a jump. */
  #release(v: number): void {
    this.#held[v] = 0;
    this.#floor[v] = 0;
    this.#decayFactor[v] = this.#releaseFactor[v] ?? 0;
    this.#state[v] = STATE_DECAY;
  }

  #start(
    midi: number,
    timbre: Timbre,
    pan: number,
    velocity: number,
    delayS: number,
    layer: number,
    bank: number,
    held: boolean,
  ): void {
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
    const peak = timbre.amplitude * velocity;
    // Every oscillator starts at phase zero: the note begins without a click.
    this.#phaseA[chosen] = 0;
    this.#phaseB[chosen] = 0;
    this.#phaseModulator[chosen] = 0;
    this.#incrementA[chosen] = (frequency - timbre.detuneHz) / this.#fs;
    this.#incrementB[chosen] = (frequency + timbre.detuneHz) / this.#fs;
    this.#incrementModulator[chosen] = (frequency * timbre.ratio) / this.#fs;
    this.#amplitude[chosen] = 0;
    this.#peak[chosen] = peak;
    this.#attackStep[chosen] = peak / (timbre.attackS * this.#fs);
    this.#floor[chosen] = held ? peak * timbre.sustain : 0;
    this.#decayFactor[chosen] = Math.exp(-1 / (timbre.decayS * this.#fs));
    this.#releaseFactor[chosen] = Math.exp(-1 / (timbre.releaseS * this.#fs));
    const softening = Math.min(1, Math.sqrt(BRIGHTNESS_REFERENCE_HZ / frequency)) / (2 * Math.PI);
    this.#indexBody[chosen] = timbre.body * softening;
    this.#indexRange[chosen] = (timbre.brightness - timbre.body) * velocity * softening;
    this.#gainALeft[chosen] = panGain(pan - timbre.width / 2, false);
    this.#gainARight[chosen] = panGain(pan - timbre.width / 2, true);
    this.#gainBLeft[chosen] = panGain(pan + timbre.width / 2, false);
    this.#gainBRight[chosen] = panGain(pan + timbre.width / 2, true);
    const delay = Math.round(delayS * this.#fs);
    this.#delay[chosen] = delay;
    this.#state[chosen] = delay > 0 ? STATE_WAITING : STATE_ATTACK;
    this.#layer[chosen] = layer;
    this.#bank[chosen] = bank;
    this.#note[chosen] = midi;
    this.#held[chosen] = held ? 1 : 0;
  }
}

/** Keeps an advancing phase, in cycles, within [0, 1) so it never loses precision. */
export function wrap(phase: number): number {
  return phase >= 1 ? phase - 1 : phase;
}

/** Equal-power gain of one channel for a place between the left (−1) and the right (1). */
export function panGain(position: number, right: boolean): number {
  const angle = ((Math.min(1, Math.max(-1, position)) + 1) * Math.PI) / 4;
  return right ? Math.sin(angle) : Math.cos(angle);
}
