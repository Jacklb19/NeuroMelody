/**
 * Fábrica real del motor de audio. Es el único módulo que importa los
 * worklets: Vite los empaqueta como archivos del mismo origen, cargados por
 * audioWorklet.addModule() bajo la CSP `script-src 'self'`.
 */
import urlRecortador from '../worklet/clipper.worklet.ts?worker&url';
import urlSintetizador from '../worklet/synthesizer.worklet.ts?worker&url';
import { createTelemetryBuffer } from '../telemetry/telemetryRing';
import type { AudioFactory } from '../engine/AudioEngine';

export const SAMPLE_RATE = 48_000;

export const browserFactory: AudioFactory = {
  createAudioContext: () =>
    new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: 'playback' }),
  modules: [urlSintetizador, urlRecortador],
  createWorkletNode: (context, name, options) => new AudioWorkletNode(context, name, options),
  // SharedArrayBuffer solo existe con aislamiento de origen cruzado (COOP y COEP).
  createTelemetryBuffer: () => (globalThis.crossOriginIsolated ? createTelemetryBuffer() : null),
  createAudioElement: () => document.createElement('audio'),
  wait: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
};
