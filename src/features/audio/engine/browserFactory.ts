/**
 * Fábrica real del motor de audio. Es el único módulo que importa los
 * worklets: Vite los empaqueta como archivos del mismo origen, cargados por
 * audioWorklet.addModule() bajo la CSP `script-src 'self'`.
 */
import urlRecortador from '../worklet/clipper.worklet.ts?worker&url';
import urlSintetizador from '../worklet/synthesizer.worklet.ts?worker&url';
import { crearBuferTelemetria } from '../telemetry/telemetryRing';
import type { FabricaAudio } from '../engine/AudioEngine';

export const FRECUENCIA_MUESTREO = 48_000;

export const fabricaDelNavegador: FabricaAudio = {
  crearContexto: () =>
    new AudioContext({ sampleRate: FRECUENCIA_MUESTREO, latencyHint: 'playback' }),
  modulos: [urlSintetizador, urlRecortador],
  crearNodoWorklet: (contexto, nombre, opciones) => new AudioWorkletNode(contexto, nombre, opciones),
  // SharedArrayBuffer solo existe con aislamiento de origen cruzado (COOP y COEP).
  crearBuferTelemetria: () => (globalThis.crossOriginIsolated ? crearBuferTelemetria() : null),
  crearElementoAudio: () => document.createElement('audio'),
  esperar: (ms) =>
    new Promise((resolver) => {
      setTimeout(resolver, ms);
    }),
};
