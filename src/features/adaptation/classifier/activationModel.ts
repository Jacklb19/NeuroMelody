import { ACTIVATION_STATE_IDS, type ActivationState } from '../activationStates';

/**
 * The trained activation classifier (ADR-32): a multinomial logistic
 * regression exported by `back/training/train.py`. The file is plain numbers,
 * so the app runs it as arithmetic: no runtime, no WebAssembly, no network
 * after the first load.
 *
 *   probability = softmax((weights · ((x − mean) / scale) + bias) / temperature)
 */

/** Layout of the JSON this code understands; any other version is rejected. */
export const ACTIVATION_MODEL_SCHEMA_VERSION = 1;

/** Same-origin URL of the model, a static file bundled with the app (ADR-09). */
export const ACTIVATION_MODEL_URL = '/models/activation-classifier.json';

export const ACTIVATION_MODEL_KIND = 'multinomial_logistic_regression';

/**
 * Inputs of the model, in order: each indicator against the person's own
 * baseline, as a natural-log ratio. `back/training/features.py` builds the
 * training examples with exactly these, so the two lists must stay equal.
 */
export const ACTIVATION_FEATURES = ['ln_heart_rate_ratio', 'ln_rmssd_ratio', 'ln_sdnn_ratio'] as const;

export interface ActivationModel {
  /** Day the model was trained, shown with its figures. */
  readonly trainedAt: string;
  /** State each row of `weights` and entry of `bias` stands for. */
  readonly classes: readonly ActivationState[];
  readonly mean: readonly number[];
  readonly scale: readonly number[];
  readonly weights: readonly (readonly number[])[];
  readonly bias: readonly number[];
  /** Softens the probabilities so the confidence matches how often the model is right. */
  readonly temperature: number;
}

/** What the model needs about one moment: the reading and the person's baseline. */
export interface Indicators {
  readonly meanHr: number;
  readonly rmssd: number;
  readonly sdnn: number;
}

export interface Prediction {
  readonly state: ActivationState;
  /** Calibrated probability of `state`, from 0 to 1. */
  readonly confidence: number;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;

function isNumbers(value: unknown, length: number): value is number[] {
  return Array.isArray(value) && value.length === length && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

function sameList(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value) && value.length === expected.length && value.every((item, index) => item === expected[index]);
}

function isState(value: unknown): value is ActivationState {
  return ACTIVATION_STATE_IDS.some((state) => state === value);
}

/**
 * Validates the model file at the boundary. A file of another version, with
 * other inputs, a class the app does not know or a number that is not finite
 * is rejected whole: the rules take over rather than a half-read model.
 */
export function parseActivationModel(value: unknown): ActivationModel | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== ACTIVATION_MODEL_SCHEMA_VERSION || value.kind !== ACTIVATION_MODEL_KIND) return null;
  if (!sameList(value.features, ACTIVATION_FEATURES)) return null;
  const { classes, weights } = value;
  if (!Array.isArray(classes) || !classes.every(isState)) return null;
  // Every state exactly once, so no state is unreachable and none is counted twice.
  if (classes.length !== ACTIVATION_STATE_IDS.length || new Set(classes).size !== classes.length) return null;
  const inputs = ACTIVATION_FEATURES.length;
  if (!isNumbers(value.mean, inputs) || !isNumbers(value.scale, inputs) || value.scale.some((scale) => scale <= 0)) return null;
  if (!Array.isArray(weights) || weights.length !== classes.length || !weights.every((row) => isNumbers(row, inputs))) return null;
  if (!isNumbers(value.bias, classes.length)) return null;
  if (typeof value.temperature !== 'number' || !Number.isFinite(value.temperature) || value.temperature <= 0) return null;
  return {
    trainedAt: typeof value.trainedAt === 'string' ? value.trainedAt : '',
    classes,
    mean: value.mean,
    scale: value.scale,
    weights,
    bias: value.bias,
    temperature: value.temperature,
  };
}

/**
 * The model's estimate for one reading, or `null` when an indicator or its
 * baseline is not a positive number (a ratio would be meaningless).
 */
export function predictActivation(model: ActivationModel, reading: Indicators, baseline: Indicators): Prediction | null {
  const pairs: readonly (readonly [number, number])[] = [
    [reading.meanHr, baseline.meanHr],
    [reading.rmssd, baseline.rmssd],
    [reading.sdnn, baseline.sdnn],
  ];
  if (pairs.some(([value, base]) => !(value > 0) || !(base > 0))) return null;
  const inputs = pairs.map(([value, base], index) => (Math.log(value / base) - (model.mean[index] ?? 0)) / (model.scale[index] ?? 1));
  const scores = model.weights.map((row, index) =>
    (row.reduce((sum, weight, input) => sum + weight * (inputs[input] ?? 0), 0) + (model.bias[index] ?? 0)) / model.temperature);
  // Softmax, shifted by the largest score so the exponentials cannot overflow.
  const top = Math.max(...scores);
  const exponentials = scores.map((score) => Math.exp(score - top));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  const best = scores.indexOf(top);
  const state = model.classes[best];
  if (state === undefined || !Number.isFinite(total) || total <= 0) return null;
  return { state, confidence: (exponentials[best] ?? 0) / total };
}

/** Where the app keeps the latest published model it downloaded, so it is still there without a network. */
export const PUBLISHED_MODEL_STORAGE_KEY = 'neuromelody.classifier';

/** Longest wait for the published model before the session goes on with what it has. */
export const PUBLISHED_MODEL_TIMEOUT_MS = 4000;

type ModelStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The browser's storage, or `null` where it is blocked. */
function browserModelStorage(): ModelStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function remembered(storage: ModelStorage | null): ActivationModel | null {
  try {
    return parseActivationModel(JSON.parse(storage?.getItem(PUBLISHED_MODEL_STORAGE_KEY) ?? 'null'));
  } catch {
    return null;
  }
}

interface LatestModelOptions {
  /**
   * Asks for the file of the latest published model: `null` when none has been
   * published. Omitted when nobody is signed in or there is no API to ask.
   */
  readonly published?: () => Promise<unknown>;
  readonly storage?: ModelStorage | null;
  readonly fetchModel?: typeof fetch;
  readonly timeoutMs?: number;
}

/**
 * The model the session runs with: the latest version a person published
 * (ADR-33), if it can be had and is valid; otherwise the last one this
 * device downloaded; otherwise the one the app ships with. It never waits
 * long and never fails: a published file that does not validate is ignored
 * whole, exactly like a damaged bundled one. The model is only ever read
 * here; it is trained and published elsewhere, by people.
 */
export async function loadLatestActivationModel({
  published, storage = browserModelStorage(), fetchModel = fetch, timeoutMs = PUBLISHED_MODEL_TIMEOUT_MS,
}: LatestModelOptions = {}): Promise<ActivationModel | null> {
  if (published !== undefined) {
    const unanswered = Symbol('unanswered');
    const answer = await Promise.race([
      published().catch(() => unanswered),
      new Promise<typeof unanswered>((resolve) => { setTimeout(() => { resolve(unanswered); }, timeoutMs); }),
    ]);
    if (answer === null) {
      // No version is published any more (it was withdrawn): the one kept here goes too.
      try {
        storage?.removeItem(PUBLISHED_MODEL_STORAGE_KEY);
      } catch {
        // Nothing kept, nothing to forget.
      }
    } else if (answer !== unanswered) {
      const model = parseActivationModel(answer);
      if (model !== null) {
        try {
          storage?.setItem(PUBLISHED_MODEL_STORAGE_KEY, JSON.stringify(answer));
        } catch {
          // Without storage it is simply asked for again next time.
        }
        return model;
      }
    }
  }
  return remembered(storage) ?? loadActivationModel(fetchModel);
}

/**
 * Downloads and validates the model the app ships with. Any failure (offline
 * before the first visit, a damaged file) resolves to `null`, and the app keeps its rules.
 */
export async function loadActivationModel(fetchModel: typeof fetch = fetch): Promise<ActivationModel | null> {
  try {
    const response = await fetchModel(ACTIVATION_MODEL_URL);
    if (!response.ok) return null;
    return parseActivationModel(await response.json());
  } catch {
    return null;
  }
}
