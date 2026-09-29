import { createRandom } from '../../acquisition/simulator/prng';

export interface ImpulseResponseOptions {
  readonly durationS: number;
  /** Tiempo en que la cola cae 60 dB. */
  readonly rt60S: number;
  readonly seed: number;
}

export const DEFAULT_IMPULSE_RESPONSE: ImpulseResponseOptions = { durationS: 3.5, rt60S: 2.8, seed: 20260929 };

/** Ln(1000): una caída de 60 dB en amplitud. */
const DECAY_60_DB = Math.log(1000);
const FADE_IN_S = 0.005;

/**
 * Respuesta al impulso estéreo generada en código (ruido con caída
 * exponencial), sin archivos externos. Cada canal usa una secuencia distinta
 * para dar amplitud estéreo. Es determinista para una misma semilla.
 */
export function generateImpulseResponse(
  sampleRate: number,
  options: ImpulseResponseOptions = DEFAULT_IMPULSE_RESPONSE,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const length = Math.round(options.durationS * sampleRate);
  const fadeSamples = Math.max(1, Math.round(FADE_IN_S * sampleRate));
  const channels: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [
    new Float32Array(length),
    new Float32Array(length),
  ];

  channels.forEach((channel, index) => {
    const random = createRandom(options.seed + index);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp((-DECAY_60_DB * t) / options.rt60S);
      // Entrada suave de 5 ms para que la cola no empiece con un chasquido.
      const input = Math.min(1, i / fadeSamples);
      channel[i] = (random() * 2 - 1) * decay * input;
    }
  });
  return channels;
}
