import type { ClassifiedBeat } from './types';
import { MIN_ACCEPTANCE } from './thresholds';

/** Uniform resampling rate of the NN series, in Hz (Task Force, 1996). */
export const RESAMPLE_HZ = 4;
/** Frequency bands in Hz, upper bound exclusive. */
export const LF_BAND_HZ = [0.04, 0.15] as const;
export const HF_BAND_HZ = [0.15, 0.4] as const;
/** Minimum continuous signal for a stable LF estimate (docs/propuestas.md). */
export const MIN_SPECTRUM_MS = 120_000;

/** Frequency-domain indices (RF-06). Powers in ms². */
export interface FrequencyIndices {
  readonly lfPower: number;
  readonly hfPower: number;
  /** `null` when there is no HF power to divide by. */
  readonly lfHfRatio: number | null;
}

/**
 * Computes LF and HF power over the most recent continuous stretch of beats.
 *
 * Pipeline: beat times from the cumulative RR sum, natural cubic spline of
 * the accepted NN values resampled at 4 Hz, linear detrending, Hann window,
 * FFT and integration of the one-sided PSD per band.
 *
 * Discarded beats keep their duration on the time axis (an ectopic pair does
 * not shift later beats) and their value is interpolated. A gap or contact
 * loss ends the stretch: the time between beats is unknown there, so
 * splicing both sides would invent oscillations.
 *
 * @returns `null` until the stretch covers 2 minutes with enough accepted beats.
 */
export function computeFrequencyIndices(
  beats: readonly ClassifiedBeat[],
): FrequencyIndices | null {
  const run = latestContinuousRun(beats);
  const times: number[] = [];
  const values: number[] = [];
  let elapsedS = 0;
  for (const beat of run) {
    elapsedS += beat.rrMs / 1000;
    if (beat.accepted) {
      times.push(elapsedS);
      values.push(beat.rrMs);
    }
  }
  const first = times[0];
  const last = times.at(-1);
  if (
    first === undefined ||
    last === undefined ||
    (last - first) * 1000 < MIN_SPECTRUM_MS ||
    times.length < MIN_ACCEPTANCE * run.length
  ) {
    return null;
  }

  const samples = detrend(resample(times, values, first, last));
  const psd = periodogram(samples, RESAMPLE_HZ);
  const lfPower = bandPower(psd, LF_BAND_HZ);
  const hfPower = bandPower(psd, HF_BAND_HZ);
  return { lfPower, hfPower, lfHfRatio: hfPower > 0 ? lfPower / hfPower : null };
}

/** Beats after the last gap or contact loss, contact-loss beats excluded. */
function latestContinuousRun(beats: readonly ClassifiedBeat[]): readonly ClassifiedBeat[] {
  for (let i = beats.length - 1; i >= 0; i--) {
    const beat = beats[i];
    if (beat === undefined) break;
    if (beat.discardReason === 'no_contact') return beats.slice(i + 1);
    if (!beat.contiguousWithPrevious) return beats.slice(i);
  }
  return beats;
}

function resample(times: readonly number[], values: readonly number[], from: number, to: number): Float64Array {
  const spline = naturalCubicSpline(times, values);
  const count = Math.floor((to - from) * RESAMPLE_HZ) + 1;
  const samples = new Float64Array(count);
  let segment = 0;
  for (let i = 0; i < count; i++) {
    const t = from + i / RESAMPLE_HZ;
    while (segment < times.length - 2 && t > (times[segment + 1] ?? Infinity)) segment++;
    samples[i] = spline(segment, t);
  }
  return samples;
}

/**
 * Natural cubic spline through (x, y). Returns an evaluator that takes the
 * segment index, so resampling in order stays linear in time.
 */
function naturalCubicSpline(
  x: readonly number[],
  y: readonly number[],
): (segment: number, t: number) => number {
  const n = x.length;
  const at = (array: readonly number[] | Float64Array, i: number): number => array[i] ?? 0;
  const secondDerivatives = new Float64Array(n);
  if (n > 2) {
    // Thomas algorithm for the tridiagonal system of interior second derivatives.
    const diagonal = new Float64Array(n);
    const rhs = new Float64Array(n);
    for (let i = 1; i < n - 1; i++) {
      const hPrev = at(x, i) - at(x, i - 1);
      const hNext = at(x, i + 1) - at(x, i);
      diagonal[i] = 2 * (hPrev + hNext);
      rhs[i] = 6 * ((at(y, i + 1) - at(y, i)) / hNext - (at(y, i) - at(y, i - 1)) / hPrev);
      if (i > 1) {
        const factor = hPrev / at(diagonal, i - 1);
        diagonal[i] = at(diagonal, i) - factor * hPrev;
        rhs[i] = at(rhs, i) - factor * at(rhs, i - 1);
      }
    }
    for (let i = n - 2; i >= 1; i--) {
      const hNext = at(x, i + 1) - at(x, i);
      secondDerivatives[i] = (at(rhs, i) - hNext * at(secondDerivatives, i + 1)) / at(diagonal, i);
    }
  }
  return (segment, t) => {
    const x0 = at(x, segment);
    const x1 = at(x, segment + 1);
    const h = x1 - x0;
    const a = (x1 - t) / h;
    const b = (t - x0) / h;
    const m0 = at(secondDerivatives, segment);
    const m1 = at(secondDerivatives, segment + 1);
    return a * at(y, segment) + b * at(y, segment + 1) +
      ((a ** 3 - a) * m0 + (b ** 3 - b) * m1) * (h * h) / 6;
  };
}

/** Removes the least-squares line so slow drifts do not leak into LF. */
function detrend(samples: Float64Array): Float64Array {
  const n = samples.length;
  const meanX = (n - 1) / 2;
  let meanY = 0;
  for (const value of samples) meanY += value / n;
  let covariance = 0;
  let variance = 0;
  samples.forEach((value, i) => {
    covariance += (i - meanX) * (value - meanY);
    variance += (i - meanX) ** 2;
  });
  const slope = variance > 0 ? covariance / variance : 0;
  return samples.map((value, i) => value - meanY - slope * (i - meanX));
}

interface Spectrum {
  readonly density: Float64Array;
  readonly resolutionHz: number;
}

/** One-sided Hann-windowed periodogram in ms²/Hz, zero-padded to a power of two. */
function periodogram(samples: Float64Array, sampleRateHz: number): Spectrum {
  const n = samples.length;
  let size = 1;
  while (size < n) size *= 2;
  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);
  let windowEnergy = 0;
  for (let i = 0; i < n; i++) {
    const weight = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    real[i] = (samples[i] ?? 0) * weight;
    windowEnergy += weight * weight;
  }
  fft(real, imaginary);
  const density = new Float64Array(size / 2 + 1);
  for (let k = 0; k <= size / 2; k++) {
    const magnitude = (real[k] ?? 0) ** 2 + (imaginary[k] ?? 0) ** 2;
    // Bins other than DC and Nyquist also carry the negative frequencies.
    const sides = k === 0 || k === size / 2 ? 1 : 2;
    density[k] = (sides * magnitude) / (sampleRateHz * windowEnergy);
  }
  return { density, resolutionHz: sampleRateHz / size };
}

function bandPower({ density, resolutionHz }: Spectrum, [low, high]: readonly [number, number]): number {
  let power = 0;
  density.forEach((value, k) => {
    const frequency = k * resolutionHz;
    if (frequency >= low && frequency < high) power += value * resolutionHz;
  });
  return power;
}

/** In-place iterative radix-2 FFT; the length must be a power of two. */
export function fft(real: Float64Array, imaginary: Float64Array): void {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; (j & bit) !== 0; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j] ?? 0, real[i] ?? 0];
      [imaginary[i], imaginary[j]] = [imaginary[j] ?? 0, imaginary[i] ?? 0];
    }
  }
  for (let length = 2; length <= n; length *= 2) {
    const angle = (-2 * Math.PI) / length;
    for (let start = 0; start < n; start += length) {
      for (let k = 0; k < length / 2; k++) {
        const cos = Math.cos(angle * k);
        const sin = Math.sin(angle * k);
        const even = start + k;
        const odd = even + length / 2;
        const oddReal = (real[odd] ?? 0) * cos - (imaginary[odd] ?? 0) * sin;
        const oddImaginary = (real[odd] ?? 0) * sin + (imaginary[odd] ?? 0) * cos;
        real[odd] = (real[even] ?? 0) - oddReal;
        imaginary[odd] = (imaginary[even] ?? 0) - oddImaginary;
        real[even] = (real[even] ?? 0) + oddReal;
        imaginary[even] = (imaginary[even] ?? 0) + oddImaginary;
      }
    }
  }
}
