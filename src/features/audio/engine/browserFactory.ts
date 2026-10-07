/**
 * Real audio engine factory. It is the only module that imports the
 * worklets: Vite bundles them as same-origin files, loaded by
 * audioWorklet.addModule() under the `script-src 'self'` CSP.
 */
import clipperUrl from '../worklet/clipper.worklet.ts?worker&url';
import synthesizerUrl from '../worklet/synthesizer.worklet.ts?worker&url';
import { createTelemetryBuffer } from '../telemetry/telemetryRing';
import type { AudioFactory } from '../engine/AudioEngine';

export const SAMPLE_RATE = 48_000;
/** Long listening sessions favour stable playback over low latency. */
const LATENCY_HINT: AudioContextLatencyCategory = 'playback';

export const browserFactory: AudioFactory = {
  createAudioContext: () =>
    new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: LATENCY_HINT }),
  modules: [synthesizerUrl, clipperUrl],
  createWorkletNode: (context, name, options) => new AudioWorkletNode(context, name, options),
  // SharedArrayBuffer only exists with cross-origin isolation (COOP and COEP).
  createTelemetryBuffer: () => (globalThis.crossOriginIsolated ? createTelemetryBuffer() : null),
  createAudioElement: () => document.createElement('audio'),
  wait: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
};
