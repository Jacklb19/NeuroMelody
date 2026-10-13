import { createRandom } from '../../acquisition/simulator/prng';

export interface ImpulseResponseOptions {
  readonly durationS: number;
  /** Time for the tail to drop by 60 dB. */
  readonly rt60S: number;
  readonly seed: number;
  /** Silence before the reverb answers, so every note is heard clean before its echo. */
  readonly preDelayS: number;
  /** Time the tail takes to build up, instead of starting at full level like a slap. */
  readonly onsetS: number;
  /**
   * Cutoff of the tail when it starts and when it ends, in Hz. It falls in
   * between, because in a room the high frequencies die sooner than the low
   * ones: the tail stays warm instead of hissing.
   */
  readonly startCutoffHz: number;
  readonly endCutoffHz: number;
}

export const DEFAULT_IMPULSE_RESPONSE: ImpulseResponseOptions = {
  durationS: 4.5,
  rt60S: 3.6,
  seed: 20260929,
  preDelayS: 0.025,
  onsetS: 0.03,
  startCutoffHz: 7000,
  endCutoffHz: 900,
};

/** Ln(1000): a 60 dB drop in amplitude. */
const DECAY_60_DB = Math.log(1000);

/**
 * Stereo impulse response generated in code, with no external files: noise
 * that decays exponentially and darkens along the way, after a short
 * pre-delay. Each channel uses a different sequence for stereo width. It is
 * deterministic for the same seed.
 */
export function generateImpulseResponse(
  sampleRate: number,
  options: ImpulseResponseOptions = DEFAULT_IMPULSE_RESPONSE,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const length = Math.round(options.durationS * sampleRate);
  const preDelay = Math.round(options.preDelayS * sampleRate);
  const tailS = options.durationS - options.preDelayS;
  const channels: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [
    new Float32Array(length),
    new Float32Array(length),
  ];

  channels.forEach((channel, index) => {
    const random = createRandom(options.seed + index);
    let filtered = 0;
    for (let i = preDelay; i < length; i++) {
      const t = (i - preDelay) / sampleRate;
      const cutoff = options.startCutoffHz * (options.endCutoffHz / options.startCutoffHz) ** (t / tailS);
      // One-pole low-pass. Its output shrinks as the cutoff falls, so it is
      // scaled back: the level follows the decay and only the colour changes.
      const pole = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
      filtered += pole * (random() * 2 - 1 - filtered);
      const decay = Math.exp((-DECAY_60_DB * t) / options.rt60S);
      const onset = Math.min(1, t / options.onsetS);
      channel[i] = (filtered / Math.sqrt(pole / (2 - pole))) * decay * onset;
    }
  });
  return channels;
}
