/**
 * Offline signal processing for the sample renderer: the parts of the audio
 * graph the browser provides natively (low-pass filter and convolution
 * reverb), rebuilt from the Web Audio specification so a rendered file sounds
 * like the session. Nothing here runs in the app.
 */

/** Bytes per sample and peak value of 16-bit PCM. */
const PCM_BYTES = 2;
const PCM_PEAK = 32767;
/** Size of the canonical WAV header, in bytes. */
const WAV_HEADER_BYTES = 44;
/** Format tag of uncompressed PCM in a WAV header. */
const WAV_FORMAT_PCM = 1;

/** ConvolverNode normalization constants (Web Audio specification, "Response normalization"). */
const CONVOLVER_GAIN_CALIBRATION = 0.00125;
const CONVOLVER_CALIBRATION_RATE_HZ = 44_100;
const CONVOLVER_MIN_POWER = 0.000125;

function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/** In-place iterative radix-2 FFT; `inverse` also divides by the length. */
export function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; (j & bit) !== 0; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i] ?? 0;
      re[i] = re[j] ?? 0;
      re[j] = tr;
      const ti = im[i] ?? 0;
      im[i] = im[j] ?? 0;
      im[j] = ti;
    }
  }
  for (let length = 2; length <= n; length *= 2) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / length;
    const stepRe = Math.cos(angle);
    const stepIm = Math.sin(angle);
    for (let start = 0; start < n; start += length) {
      let wRe = 1;
      let wIm = 0;
      for (let k = 0; k < length / 2; k++) {
        const a = start + k;
        const b = a + length / 2;
        const bRe = (re[b] ?? 0) * wRe - (im[b] ?? 0) * wIm;
        const bIm = (re[b] ?? 0) * wIm + (im[b] ?? 0) * wRe;
        re[b] = (re[a] ?? 0) - bRe;
        im[b] = (im[a] ?? 0) - bIm;
        re[a] = (re[a] ?? 0) + bRe;
        im[a] = (im[a] ?? 0) + bIm;
        const nextRe = wRe * stepRe - wIm * stepIm;
        wIm = wRe * stepIm + wIm * stepRe;
        wRe = nextRe;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] = (re[i] ?? 0) / n;
      im[i] = (im[i] ?? 0) / n;
    }
  }
}

/** Convolution of `signal` with `response`, cut to the length of `signal`. */
export function convolve(signal: Float32Array, response: Float32Array): Float32Array {
  const size = nextPowerOfTwo(signal.length + response.length);
  const aRe = new Float64Array(size);
  const aIm = new Float64Array(size);
  const bRe = new Float64Array(size);
  const bIm = new Float64Array(size);
  aRe.set(signal);
  bRe.set(response);
  fft(aRe, aIm, false);
  fft(bRe, bIm, false);
  for (let i = 0; i < size; i++) {
    const re = (aRe[i] ?? 0) * (bRe[i] ?? 0) - (aIm[i] ?? 0) * (bIm[i] ?? 0);
    aIm[i] = (aRe[i] ?? 0) * (bIm[i] ?? 0) + (aIm[i] ?? 0) * (bRe[i] ?? 0);
    aRe[i] = re;
  }
  fft(aRe, aIm, true);
  return Float32Array.from(aRe.subarray(0, signal.length));
}

/** Gain a ConvolverNode applies to its response when `normalize` is on (the default). */
export function convolverNormalization(channels: readonly Float32Array[], sampleRate: number): number {
  let power = 0;
  let length = 0;
  for (const channel of channels) {
    length = channel.length;
    for (const sample of channel) power += sample * sample;
  }
  const rms = Math.max(CONVOLVER_MIN_POWER, Math.sqrt(power / (channels.length * length)));
  return (CONVOLVER_GAIN_CALIBRATION * CONVOLVER_CALIBRATION_RATE_HZ) / (rms * sampleRate);
}

/**
 * Low-pass BiquadFilterNode, with the cutoff read every `blockSize` samples
 * (the node follows its `frequency` automation the same way). `q` is in dB,
 * as the specification defines it for this filter type.
 */
export function lowPass(
  signal: Float32Array,
  sampleRate: number,
  q: number,
  blockSize: number,
  cutoffAt: (timeS: number) => number,
): Float32Array {
  const output = new Float32Array(signal.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  let b0 = 0;
  let b1 = 0;
  let a1 = 0;
  let a2 = 0;
  for (let n = 0; n < signal.length; n++) {
    if (n % blockSize === 0) {
      const w0 = (2 * Math.PI * cutoffAt(n / sampleRate)) / sampleRate;
      const alpha = Math.sin(w0) / (2 * 10 ** (q / 20));
      const a0 = 1 + alpha;
      b1 = (1 - Math.cos(w0)) / a0;
      b0 = b1 / 2;
      a1 = (-2 * Math.cos(w0)) / a0;
      a2 = (1 - alpha) / a0;
    }
    const x = signal[n] ?? 0;
    const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    output[n] = y;
  }
  return output;
}

export interface BandEnergy {
  readonly label: string;
  /** Share of the total energy in the band, from 0 to 1. */
  readonly share: number;
}

export interface Spectrum {
  readonly bands: readonly BandEnergy[];
  /**
   * Level with the A curve of IEC 61672, which weighs each frequency by how
   * loud the ear hears it: two files with the same value sound about as loud.
   */
  readonly aWeightedDb: number;
}

/** Corner frequencies of the A-weighting curve (IEC 61672), in Hz, and its gain at 1 kHz. */
const A_CORNERS_HZ = [20.6, 107.7, 737.9, 12_194] as const;
const A_GAIN_AT_1_KHZ = 10 ** (2 / 20);

function aWeight(frequency: number): number {
  const f2 = frequency * frequency;
  const [c1, c2, c3, c4] = A_CORNERS_HZ;
  return (
    (A_GAIN_AT_1_KHZ * c4 * c4 * f2 * f2) /
    ((f2 + c1 * c1) * Math.sqrt((f2 + c2 * c2) * (f2 + c3 * c3)) * (f2 + c4 * c4))
  );
}

/** Share of the energy of `signal` between each pair of consecutive `edgesHz`, and its A-weighted level. */
export function spectrum(signal: Float32Array, sampleRate: number, edgesHz: readonly number[]): Spectrum {
  const size = nextPowerOfTwo(signal.length);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  re.set(signal);
  fft(re, im, false);
  const totals = new Float64Array(edgesHz.length - 1);
  let total = 0;
  let weighted = 0;
  for (let bin = 1; bin < size / 2; bin++) {
    const frequency = (bin * sampleRate) / size;
    const power = (re[bin] ?? 0) ** 2 + (im[bin] ?? 0) ** 2;
    total += power;
    weighted += power * aWeight(frequency) ** 2;
    for (let band = 0; band < totals.length; band++) {
      if (frequency >= (edgesHz[band] ?? 0) && frequency < (edgesHz[band + 1] ?? 0)) {
        totals[band] = (totals[band] ?? 0) + power;
      }
    }
  }
  return {
    bands: Array.from(totals, (power, band) => ({
      label: `${String(edgesHz[band])}-${String(edgesHz[band + 1])} Hz`,
      share: total === 0 ? 0 : power / total,
    })),
    // Parseval: the mean square of the signal is twice the sum over positive bins, divided by size × length.
    aWeightedDb: 10 * Math.log10((2 * weighted) / (size * signal.length)),
  };
}

/** Stereo 16-bit PCM WAV file. `dither` returns uniform numbers in [0, 1). */
export function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number, dither: () => number): Buffer {
  const channels = 2;
  const dataBytes = left.length * channels * PCM_BYTES;
  const buffer = Buffer.alloc(WAV_HEADER_BYTES + dataBytes);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(WAV_HEADER_BYTES - 8 + dataBytes, 4);
  buffer.write('WAVEfmt ', 8, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(WAV_FORMAT_PCM, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * PCM_BYTES, 28);
  buffer.writeUInt16LE(channels * PCM_BYTES, 32);
  buffer.writeUInt16LE(PCM_BYTES * 8, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);
  let offset = WAV_HEADER_BYTES;
  for (let n = 0; n < left.length; n++) {
    for (const channel of [left, right]) {
      // Triangular dither of one step keeps quiet tails free of quantization buzz.
      const value = (channel[n] ?? 0) * PCM_PEAK + dither() - dither();
      buffer.writeInt16LE(Math.max(-PCM_PEAK, Math.min(PCM_PEAK, Math.round(value))), offset);
      offset += PCM_BYTES;
    }
  }
  return buffer;
}
