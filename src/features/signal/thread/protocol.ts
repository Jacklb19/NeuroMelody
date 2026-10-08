import type { BeatNotification } from '../../acquisition/contract';
import type { DrawingContext, CanvasDimensions } from '../drawing/drawTachogram';
import { VALUE_SLOT, type ChartLabels } from '../drawing/chartLabels';
import { PALETTE_VARIABLES, type ChartPalette } from '../drawing/palette';
import type { IndicesResult } from '../processing/SignalProcessor';
import { SIGNAL_QUALITIES } from '../processing/types';

/** What the signal thread needs from the transferred canvas (an OffscreenCanvas). */
export interface ThreadCanvas {
  width: number;
  height: number;
  getContext(kind: '2d'): DrawingContext | null;
}

/**
 * Why the signal analysis stopped updating. Logic only carries these codes;
 * the panel words them from the dictionary (ADR-25).
 */
export const SIGNAL_THREAD_ERROR_CODES = [
  /** The signal thread received a message the protocol does not define. */
  'unrecognized_message',
  /** The transferred canvas gave no 2D context. */
  'no_2d_context',
  /** A message from the signal thread could not be deserialized. */
  'unreadable_message',
  /** The signal thread answered something the protocol does not define. */
  'unrecognized_response',
] as const;
export type SignalThreadErrorCode = (typeof SIGNAL_THREAD_ERROR_CODES)[number];

/** The Worker crashed; only the browser can say why, in its own words. */
export const WORKER_CRASHED = 'worker_crashed';

/** A failure of the signal thread, as observers receive it. */
export type SignalThreadFailure =
  | { readonly code: SignalThreadErrorCode }
  | { readonly code: typeof WORKER_CRASHED; readonly detail: string };

/** Messages from the main thread to the signal thread. */
export type MessageToThread =
  | { readonly kind: 'notification'; readonly notification: BeatNotification }
  | { readonly kind: 'reset' }
  | {
      readonly kind: 'init-canvas';
      readonly canvas: ThreadCanvas;
      readonly palette: ChartPalette;
      readonly labels: ChartLabels;
      readonly dimensions: CanvasDimensions;
    }
  | { readonly kind: 'resize'; readonly dimensions: CanvasDimensions };

/** Messages from the signal thread to the main thread. */
export type MessageFromThread =
  | { readonly kind: 'indices'; readonly result: IndicesResult }
  | ({ readonly kind: 'error' } & SignalThreadFailure);

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

/** A label template must say where its figure goes, or the axis would lose it. */
function isLabels(value: unknown): value is ChartLabels {
  return isRecord(value) && isNonEmptyText(value.rrTick) && value.rrTick.includes(VALUE_SLOT);
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
    SIGNAL_QUALITIES.some((quality) => quality === value.quality) &&
    isNumberOrNull(value.lfPower) &&
    isNumberOrNull(value.hfPower) &&
    isNumberOrNull(value.lfHfRatio)
  );
}

function isFailure(value: UnknownRecord): boolean {
  return value.code === WORKER_CRASHED
    ? typeof value.detail === 'string'
    : SIGNAL_THREAD_ERROR_CODES.some((code) => code === value.code);
}

/** Validates, at the boundary, a message received by the signal thread. */
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
      return (
        isCanvas(value.canvas) &&
        isPalette(value.palette) &&
        isLabels(value.labels) &&
        isDimensions(value.dimensions)
      );
    case 'resize':
      return isDimensions(value.dimensions);
    default:
      return false;
  }
}

/** Validates, at the boundary, a message received by the main thread. */
export function isMessageFromThread(value: unknown): value is MessageFromThread {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.kind) {
    case 'indices':
      return isResult(value.result);
    case 'error':
      return isFailure(value);
    default:
      return false;
  }
}
