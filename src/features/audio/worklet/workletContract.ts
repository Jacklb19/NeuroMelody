/**
 * Contract shared by the main thread and the AudioWorklet processors:
 * registration names, parameters and creation options. It imports nothing
 * from the worklet scope, so both sides can use it.
 */
import { MODE, isMode, type Mode } from '../core/theory';

export const SYNTHESIZER_NAME = 'neuromelody-synthesizer';
export const CLIPPER_NAME = 'neuromelody-clipper';

/** Descriptor of a custom AudioParam (the TypeScript DOM library does not declare it). */
interface ParameterDescriptor {
  readonly name: string;
  readonly defaultValue: number;
  readonly minValue: number;
  readonly maxValue: number;
  readonly automationRate: AutomationRate;
}

/**
 * Synthesizer parameters as `AudioParam`: the main thread schedules ramps
 * and the audio thread interpolates them without messages (ADR-07). They are
 * k-rate (one value per 128-sample block), enough for tempo, mode and layers.
 */
export const SYNTHESIZER_DESCRIPTORS = [
  { name: 'tempo', defaultValue: 66, minValue: 40, maxValue: 120, automationRate: 'k-rate' },
  { name: 'mode', defaultValue: MODE.lydian, minValue: 0, maxValue: 2, automationRate: 'k-rate' },
  { name: 'layers', defaultValue: 2, minValue: 1, maxValue: 3, automationRate: 'k-rate' },
] as const satisfies readonly ParameterDescriptor[];

export type ParamName = (typeof SYNTHESIZER_DESCRIPTORS)[number]['name'];

export interface SynthesizerOptions {
  readonly seed: number;
  readonly initialMode: Mode;
  readonly initialLayers: number;
}

export interface ClipperOptions {
  /** Telemetry buffer; `null` without cross-origin isolation. */
  readonly telemetry: SharedArrayBuffer | null;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

/** Validates at the boundary the options that reach the processor. */
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
