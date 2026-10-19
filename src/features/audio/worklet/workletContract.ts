/**
 * Contract shared by the main thread and the AudioWorklet processors:
 * registration names, parameters and creation options. It imports nothing
 * from the worklet scope, so both sides can use it.
 */
import { isAmbienceId, type AmbienceId } from '../core/ambienceCatalog';
import { isInstrumentId, type InstrumentId } from '../core/instrumentCatalog';
import { LAYER_COUNT, MIN_LAYERS } from '../core/SynthesisCore';
import { MODE, isMode, type Mode } from '../core/theory';
import { CALIBRATION_LEVEL, LEVELS } from '../engine/levels';

export const SYNTHESIZER_NAME = 'neuromelody-synthesizer';
export const CLIPPER_NAME = 'neuromelody-clipper';

/**
 * Outputs of the synthesizer node. The ambience leaves on its own output so
 * the brightness filter and the reverb of the music do not colour it (ADR-40).
 */
export const SYNTHESIZER_OUTPUT = { music: 0, ambience: 1 } as const;
export const SYNTHESIZER_OUTPUT_COUNT = 2;

/** Tempo range the synthesizer accepts, in BPM; it contains every level tempo. */
export const MIN_TEMPO_BPM = 40;
export const MAX_TEMPO_BPM = 120;

/** Descriptor of a custom AudioParam (the TypeScript DOM library does not declare it). */
interface ParameterDescriptor {
  readonly name: string;
  readonly defaultValue: number;
  readonly minValue: number;
  readonly maxValue: number;
  readonly automationRate: AutomationRate;
}

// Parameters start at the calibration level, where every session begins (ADR-12).
const CALIBRATION = LEVELS[CALIBRATION_LEVEL];
const MODE_VALUES: readonly Mode[] = Object.values(MODE);

/**
 * Synthesizer parameters as `AudioParam`: the main thread schedules ramps
 * and the audio thread interpolates them without messages (ADR-07). They are
 * k-rate (one value per 128-sample block), enough for tempo, mode and layers.
 */
export const SYNTHESIZER_DESCRIPTORS = [
  {
    name: 'tempo',
    defaultValue: CALIBRATION.tempo,
    minValue: MIN_TEMPO_BPM,
    maxValue: MAX_TEMPO_BPM,
    automationRate: 'k-rate',
  },
  {
    name: 'mode',
    defaultValue: CALIBRATION.mode,
    minValue: Math.min(...MODE_VALUES),
    maxValue: Math.max(...MODE_VALUES),
    automationRate: 'k-rate',
  },
  {
    name: 'layers',
    defaultValue: CALIBRATION.layers,
    minValue: MIN_LAYERS,
    maxValue: LAYER_COUNT,
    automationRate: 'k-rate',
  },
] as const satisfies readonly ParameterDescriptor[];

export type ParamName = (typeof SYNTHESIZER_DESCRIPTORS)[number]['name'];

/**
 * Default value of each parameter, read by the processor when a block carries
 * none. Written out key by key so the compiler checks every parameter name.
 */
export const SYNTHESIZER_DEFAULTS: Readonly<Record<ParamName, number>> = {
  tempo: CALIBRATION.tempo,
  mode: CALIBRATION.mode,
  layers: CALIBRATION.layers,
};

export interface SynthesizerOptions {
  readonly seed: number;
  readonly initialMode: Mode;
  readonly initialLayers: number;
  /** Ambience under the music for the whole session. */
  readonly ambience: AmbienceId;
  /** Instrument the music is played with for the whole session (ADR-46). */
  readonly instrument: InstrumentId;
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
    value.initialLayers < MIN_LAYERS ||
    value.initialLayers > LAYER_COUNT ||
    !isAmbienceId(value.ambience) ||
    !isInstrumentId(value.instrument)
  ) {
    throw new TypeError('Invalid synthesizer options.');
  }
  return {
    seed: value.seed,
    initialMode: value.initialMode,
    initialLayers: value.initialLayers,
    ambience: value.ambience,
    instrument: value.instrument,
  };
}

export function readClipperOptions(value: unknown): ClipperOptions {
  if (!isRecord(value)) {
    throw new TypeError('Invalid clipper options.');
  }
  const { telemetry } = value;
  if (telemetry !== null && !(telemetry instanceof SharedArrayBuffer)) {
    throw new TypeError('Telemetry must be a SharedArrayBuffer or null.');
  }
  return { telemetry };
}
