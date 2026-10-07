import { createRandom } from '../../acquisition/simulator/prng';

export interface ImpulseResponseOptions {
  readonly durationS: number;
  /** Time for the tail to drop by 60 dB. */
  readonly rt60S: number;
  readonly seed: number;
}

export const DEFAULT_IMPULSE_RESPONSE: ImpulseResponseOptions = { durationS: 3.5, rt60S: 2.8, seed: 20260929 };

/** Ln(1000): a 60 dB drop in amplitude. */
const DECAY_60_DB = Math.log(1000);
/** Length of the soft onset of the response. */
const IR_ONSET_S = 0.005;

/**
 * Stereo impulse response generated in code (noise with an exponential
 * decay), with no external files. Each channel uses a different sequence
 * for stereo width. It is deterministic for the same seed.
 */
export function generateImpulseResponse(
  sampleRate: number,
  options: ImpulseResponseOptions = DEFAULT_IMPULSE_RESPONSE,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const length = Math.round(options.durationS * sampleRate);
  const fadeSamples = Math.max(1, Math.round(IR_ONSET_S * sampleRate));
  const channels: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [
    new Float32Array(length),
    new Float32Array(length),
  ];

  channels.forEach((channel, index) => {
    const random = createRandom(options.seed + index);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp((-DECAY_60_DB * t) / options.rt60S);
      // 5 ms soft onset so the tail does not start with a click.
      const input = Math.min(1, i / fadeSamples);
      channel[i] = (random() * 2 - 1) * decay * input;
    }
  });
  return channels;
}
