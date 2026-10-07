import type { BeatNotification } from '../../acquisition/contract';
import type { DrawingContext, CanvasDimensions } from '../../signal/drawing/drawTachogram';
import { PALETTE_VARIABLES, type ChartPalette } from '../../signal/drawing/palette';
import type { SignalQuality, IndicesResult } from '../processing/SignalProcessor';

/** Lo que el hilo de señal necesita del lienzo transferido (un OffscreenCanvas). */
export interface ThreadCanvas {
  width: number;
  height: number;
  getContext(kind: '2d'): DrawingContext | null;
}

/** Mensajes del hilo principal al hilo de señal. */
export type MessageToThread =
  | { readonly kind: 'notification'; readonly notification: BeatNotification }
  | { readonly kind: 'reset' }
  | {
      readonly kind: 'init-canvas';
      readonly canvas: ThreadCanvas;
      readonly palette: ChartPalette;
      readonly dimensions: CanvasDimensions;
    }
  | { readonly kind: 'resize'; readonly dimensions: CanvasDimensions };

/** Mensajes del hilo de señal al hilo principal. */
export type MessageFromThread =
  | { readonly kind: 'indices'; readonly result: IndicesResult }
  | { readonly kind: 'error'; readonly message: string };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function isNotification(value: unknown): value is BeatNotification {
  return (
    isRecord(value) &&
    isNumber(value.timeMs) &&
    isNumber(value.heartRate) &&
    Array.isArray(value.rrIntervalsMs) &&
    value.rrIntervalsMs.every(isNumber) &&
    (value.sensorContact === null || typeof value.sensorContact === 'boolean')
  );
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isPalette(value: unknown): value is ChartPalette {
  return (
    isRecord(value) &&
    isNonEmptyText(value.font) &&
    Object.keys(PALETTE_VARIABLES).every((key) => isNonEmptyText(value[key]))
  );
}

function isDimensions(value: unknown): value is CanvasDimensions {
  return (
    isRecord(value) &&
    isNumber(value.widthCss) &&
    isNumber(value.heightCss) &&
    isNumber(value.scale) &&
    value.widthCss >= 0 &&
    value.heightCss >= 0 &&
    value.scale > 0
  );
}

function isCanvas(value: unknown): value is ThreadCanvas {
  return (
    isRecord(value) &&
    typeof value.getContext === 'function' &&
    isNumber(value.width) &&
    isNumber(value.height)
  );
}

const QUALITIES: readonly SignalQuality[] = ['collecting', 'good', 'low'];

function isResult(value: unknown): value is IndicesResult {
  return (
    isRecord(value) &&
    isNumber(value.timeMs) &&
    isNumberOrNull(value.meanHr) &&
    isNumberOrNull(value.rmssd) &&
    isNumberOrNull(value.sdnn) &&
    isNumber(value.nnDurationMs) &&
    isNumber(value.coverageMs) &&
    isNumber(value.acceptedBeats) &&
    isNumber(value.discardedBeats) &&
    QUALITIES.some((quality) => quality === value.quality) &&
    isNumberOrNull(value.lfPower) &&
    isNumberOrNull(value.hfPower) &&
    isNumberOrNull(value.lfHfRatio)
  );
}

/** Valida en la frontera un mensaje recibido por el hilo de señal. */
export function isMessageToThread(value: unknown): value is MessageToThread {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.kind) {
    case 'notification':
      return isNotification(value.notification);
    case 'reset':
      return true;
    case 'init-canvas':
      return isCanvas(value.canvas) && isPalette(value.palette) && isDimensions(value.dimensions);
    case 'resize':
      return isDimensions(value.dimensions);
    default:
      return false;
  }
}

/** Valida en la frontera un mensaje recibido por el hilo principal. */
export function isMessageFromThread(value: unknown): value is MessageFromThread {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.kind) {
    case 'indices':
      return isResult(value.result);
    case 'error':
      return typeof value.message === 'string';
    default:
      return false;
  }
}
