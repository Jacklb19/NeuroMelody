import type { AmbienceId } from './ambienceCatalog';
import { sine } from './oscillator';
import { panGain } from './voices';

/**
 * Synthesized ambiences (ADR-40): rain, sea and wind made from filtered
 * noise, in stereo, with no sound files. They are independent of the music:
 * the worklet sends them out on their own output, so the brightness filter
 * and the reverb of each level do not touch them.
 *
 * Real-time rules: all state is allocated in the constructor and `process`
 * creates no objects. Slow movements (waves, gusts) are recomputed once every
 * `CONTROL_PERIOD` samples; only the filters run on every sample.
 */

const CHANNELS = 2;
/** Samples between two updates of the slow movements (under a millisecond at 48 kHz). */
const CONTROL_PERIOD = 32;
/** Scale of a 32-bit integer to the range −1 to 1. */
const INT32_SCALE = 2 ** 31;

// Sea: waves that swell and withdraw, brighter at the crest, a little later in one ear.
const SEA_LEVEL = 0.4;
const SEA_WAVE_PERIOD_S = 9.5;
/** A slower cycle makes some waves larger than others. */
const SEA_SET_PERIOD_S = 23;
const SEA_SET_DEPTH = 0.3;
/** Level between waves, as a share of a crest: the sea never goes silent. */
const SEA_FLOOR = 0.25;
const SEA_DARK_HZ = 350;
const SEA_BRIGHT_RANGE_HZ = 2200;
/** The second channel hears each wave this much later. */
const SEA_CHANNEL_DELAY_S = 0.6;

// Rain: a steady soft hiss and many tiny drops scattered between the ears.
const RAIN_HISS_LEVEL = 0.05;
const RAIN_HISS_LOW_HZ = 1000;
const RAIN_HISS_HIGH_HZ = 4500;
/** The hiss thickens and thins slowly, by this share. */
const RAIN_DRIFT_PERIOD_S = 13;
const RAIN_DRIFT_DEPTH = 0.15;
/** Drops that may ring at once; a new one replaces the oldest. */
const RAIN_MAX_DROPS = 6;
/** Time between two drops, in seconds: this much at least, plus a random share of the spread. */
const RAIN_DROP_GAP_S = 1 / 28;
const RAIN_DROP_GAP_SPREAD_S = 1 / 14;
const RAIN_DROP_MIN_HZ = 2000;
const RAIN_DROP_RANGE_HZ = 6000;
const RAIN_DROP_MIN_S = 0.004;
const RAIN_DROP_RANGE_S = 0.012;
/** Most drops are faint and a few stand out: the level grows with the cube of a random number. */
const RAIN_DROP_MIN_LEVEL = 0.02;
const RAIN_DROP_RANGE_LEVEL = 0.05;
/** A drop fades by this many time constants over its length. */
const RAIN_DROP_DECAY = 5;

// Wind: noise through a resonant filter whose pitch and strength wander in gusts.
const WIND_LEVEL = 0.15;
const WIND_GUST_PERIOD_S = 7.3;
const WIND_FLURRY_PERIOD_S = 3.1;
const WIND_GUST_DEPTH = 0.3;
const WIND_FLURRY_DEPTH = 0.2;
const WIND_LOW_HZ = 260;
const WIND_RANGE_HZ = 420;
/** Damping of the filter: lower rings more. */
const WIND_DAMPING = 0.35;
/** Level in the lulls, as a share of a gust. */
const WIND_FLOOR = 0.3;
const WIND_CHANNEL_DELAY_S = 1.3;

export class Ambience {
  readonly #kind: AmbienceId;
  readonly #fs: number;
  #noiseState: number;
  #seconds = 0;
  #untilControl = 0;

  // Per channel: two filter states, and the gain and filter coefficient of the current control period.
  readonly #stateA = new Float64Array(CHANNELS);
  readonly #stateB = new Float64Array(CHANNELS);
  readonly #gain = new Float64Array(CHANNELS);
  readonly #coefficient = new Float64Array(CHANNELS);

  // Rain hiss: fixed band-pass made of two one-pole filters.
  readonly #hissHigh: number;
  readonly #hissLow: number;

  // Rain drops: one slot per ringing drop.
  readonly #dropLevel = new Float64Array(RAIN_MAX_DROPS);
  readonly #dropDecay = new Float64Array(RAIN_MAX_DROPS);
  readonly #dropPhase = new Float64Array(RAIN_MAX_DROPS);
  readonly #dropIncrement = new Float64Array(RAIN_MAX_DROPS);
  readonly #dropLeft = new Float64Array(RAIN_MAX_DROPS);
  readonly #dropRight = new Float64Array(RAIN_MAX_DROPS);
  readonly #dropSamples = new Int32Array(RAIN_MAX_DROPS);
  #nextDrop = 0;
  #untilDrop = 0;

  constructor(sampleRate: number, seed: number, kind: AmbienceId) {
    this.#kind = kind;
    this.#fs = sampleRate;
    // A zero state would stay at zero for ever.
    this.#noiseState = seed | 0 || 1;
    this.#hissHigh = onePole(RAIN_HISS_HIGH_HZ, sampleRate);
    this.#hissLow = onePole(RAIN_HISS_LOW_HZ, sampleRate);
  }

  /** Fills one block in stereo. With the `none` ambience the block is left silent. */
  process(left: Float32Array, right: Float32Array): void {
    if (this.#kind === 'none') {
      left.fill(0);
      right.fill(0);
      return;
    }
    for (let n = 0; n < left.length; n++) {
      if (this.#untilControl <= 0) {
        this.#untilControl = CONTROL_PERIOD;
        this.#seconds += CONTROL_PERIOD / this.#fs;
        this.#control();
      }
      this.#untilControl--;
      let l = this.#channel(0);
      let r = this.#channel(1);
      if (this.#kind === 'rain') {
        if (this.#untilDrop <= 0) {
          this.#startDrop();
        }
        this.#untilDrop--;
        for (let d = 0; d < RAIN_MAX_DROPS; d++) {
          const samples = this.#dropSamples[d] ?? 0;
          if (samples <= 0) {
            continue;
          }
          this.#dropSamples[d] = samples - 1;
          const level = (this.#dropLevel[d] ?? 0) * (this.#dropDecay[d] ?? 0);
          const phase = (this.#dropPhase[d] ?? 0) + (this.#dropIncrement[d] ?? 0);
          this.#dropLevel[d] = level;
          this.#dropPhase[d] = phase;
          const drop = sine(phase) * level;
          l += drop * (this.#dropLeft[d] ?? 0);
          r += drop * (this.#dropRight[d] ?? 0);
        }
      }
      left[n] = l;
      right[n] = r;
    }
  }

  /** White noise from −1 to 1 (xorshift), inline so it costs no call per voice. */
  #noise(): number {
    let x = this.#noiseState;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.#noiseState = x;
    return x / INT32_SCALE;
  }

  /** One sample of the continuous part of the ambience in a channel. */
  #channel(c: number): number {
    const coefficient = this.#coefficient[c] ?? 0;
    const gain = this.#gain[c] ?? 0;
    let a = this.#stateA[c] ?? 0;
    let b = this.#stateB[c] ?? 0;
    let output: number;
    if (this.#kind === 'sea') {
      // Two low-pass filters in a row: a dark, rounded wash.
      a += coefficient * (this.#noise() - a);
      b += coefficient * (a - b);
      output = b;
    } else if (this.#kind === 'rain') {
      // Band between the two fixed filters: the hiss of fine rain.
      a += this.#hissHigh * (this.#noise() - a);
      b += this.#hissLow * (a - b);
      output = a - b;
    } else {
      // State-variable band-pass with a gentle resonance.
      b += coefficient * a;
      a += coefficient * (this.#noise() - b - WIND_DAMPING * a);
      output = a;
    }
    this.#stateA[c] = a;
    this.#stateB[c] = b;
    return output * gain;
  }

  /** Recomputes the slow movements of each channel. */
  #control(): void {
    for (let c = 0; c < CHANNELS; c++) {
      if (this.#kind === 'sea') {
        const t = this.#seconds - c * SEA_CHANNEL_DELAY_S;
        const wave = (0.5 + 0.5 * sine(t / SEA_WAVE_PERIOD_S)) ** 2;
        const swell =
          SEA_FLOOR + (1 - SEA_FLOOR) * wave * (1 - SEA_SET_DEPTH + SEA_SET_DEPTH * sine(t / SEA_SET_PERIOD_S));
        this.#coefficient[c] = onePole(SEA_DARK_HZ + SEA_BRIGHT_RANGE_HZ * swell, this.#fs);
        this.#gain[c] = SEA_LEVEL * swell;
      } else if (this.#kind === 'rain') {
        const drift = sine(this.#seconds / RAIN_DRIFT_PERIOD_S + c / CHANNELS);
        this.#gain[c] = RAIN_HISS_LEVEL * (1 - RAIN_DRIFT_DEPTH + RAIN_DRIFT_DEPTH * drift);
      } else {
        const t = this.#seconds + c * WIND_CHANNEL_DELAY_S;
        const gust =
          0.5 + WIND_GUST_DEPTH * sine(t / WIND_GUST_PERIOD_S) + WIND_FLURRY_DEPTH * sine(t / WIND_FLURRY_PERIOD_S);
        // Tuning coefficient of the state-variable filter: 2·sin(π·f/fs).
        this.#coefficient[c] = 2 * sine((WIND_LOW_HZ + WIND_RANGE_HZ * gust) / (2 * this.#fs));
        this.#gain[c] = WIND_LEVEL * (WIND_FLOOR + (1 - WIND_FLOOR) * gust);
      }
    }
  }

  #startDrop(): void {
    const d = this.#nextDrop;
    this.#nextDrop = (d + 1) % RAIN_MAX_DROPS;
    const samples = Math.max(1, Math.round((RAIN_DROP_MIN_S + RAIN_DROP_RANGE_S * this.#uniform()) * this.#fs));
    const pan = this.#uniform() * 2 - 1;
    this.#dropSamples[d] = samples;
    this.#dropLevel[d] = RAIN_DROP_MIN_LEVEL + RAIN_DROP_RANGE_LEVEL * this.#uniform() ** 3;
    this.#dropDecay[d] = Math.exp(-RAIN_DROP_DECAY / samples);
    this.#dropPhase[d] = 0;
    this.#dropIncrement[d] = (RAIN_DROP_MIN_HZ + RAIN_DROP_RANGE_HZ * this.#uniform()) / this.#fs;
    this.#dropLeft[d] = panGain(pan, false);
    this.#dropRight[d] = panGain(pan, true);
    this.#untilDrop = Math.round((RAIN_DROP_GAP_S + RAIN_DROP_GAP_SPREAD_S * this.#uniform()) * this.#fs);
  }

  /** Uniform number from 0 to 1 drawn from the same noise. */
  #uniform(): number {
    return (this.#noise() + 1) / 2;
  }
}

/** Coefficient of a one-pole low-pass filter with the given cutoff. */
function onePole(cutoffHz: number, sampleRate: number): number {
  return 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
}
