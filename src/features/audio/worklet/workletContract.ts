/**
 * Contrato compartido entre el hilo principal y los procesadores del
 * AudioWorklet: nombres de registro, parámetros y opciones de creación.
 * No importa nada del ámbito del worklet, para poder usarse en ambos lados.
 */
import { MODE, isMode, type Mode } from '../core/theory';

export const SYNTHESIZER_NAME = 'sintetizador-neuromelody';
export const CLIPPER_NAME = 'recortador-neuromelody';

/** Descriptor de un AudioParam propio (la biblioteca DOM de TypeScript no lo declara). */
interface ParameterDescriptor {
  readonly name: string;
  readonly defaultValue: number;
  readonly minValue: number;
  readonly maxValue: number;
  readonly automationRate: AutomationRate;
}

/**
 * Parámetros del sintetizador como `AudioParam`: el hilo principal programa
 * rampas y el hilo de audio las interpola sin mensajes (ADR-07). Son de tasa
 * k (un valor por bloque de 128 muestras), suficiente para tempo, modo y capas.
 */
export const SYNTHESIZER_DESCRIPTORS = [
  { name: 'tempo', defaultValue: 66, minValue: 40, maxValue: 120, automationRate: 'k-rate' },
  { name: 'modo', defaultValue: MODE.lydian, minValue: 0, maxValue: 2, automationRate: 'k-rate' },
  { name: 'capas', defaultValue: 2, minValue: 1, maxValue: 3, automationRate: 'k-rate' },
] as const satisfies readonly ParameterDescriptor[];

export type ParamName = (typeof SYNTHESIZER_DESCRIPTORS)[number]['name'];

export interface SynthesizerOptions {
  readonly seed: number;
  readonly initialMode: Mode;
  readonly initialLayers: number;
}

export interface ClipperOptions {
  /** Búfer de telemetría; `null` si no hay aislamiento de origen cruzado. */
  readonly telemetry: SharedArrayBuffer | null;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

/** Valida en la frontera las opciones que llegan al procesador. */
export function readSynthesizerOptions(value: unknown): SynthesizerOptions {
  if (
    !isRecord(value) ||
    typeof value.seed !== 'number' ||
    !Number.isInteger(value.seed) ||
    typeof value.initialMode !== 'number' ||
    !isMode(value.initialMode) ||
    typeof value.initialLayers !== 'number' ||
    value.initialLayers < 1 ||
    value.initialLayers > 3
  ) {
    throw new TypeError('Opciones del sintetizador no válidas.');
  }
  return {
    seed: value.seed,
    initialMode: value.initialMode,
    initialLayers: value.initialLayers,
  };
}

export function readClipperOptions(value: unknown): ClipperOptions {
  if (!isRecord(value)) {
    throw new TypeError('Opciones del recortador no válidas.');
  }
  const { telemetry } = value;
  if (telemetry !== null && !(telemetry instanceof SharedArrayBuffer)) {
    throw new TypeError('La telemetría debe ser un SharedArrayBuffer o null.');
  }
  return { telemetry };
}
