import {
  MAX_RECORDING_INTERVALS,
  RECORDING_DURATION_MS,
  RECORDING_DURATION_TOLERANCE_MS,
  RECORDING_SCHEMA_VERSION,
  recordingUrl,
  type RecordingId,
} from './recordingCatalog';

/** Validated, same-origin example data derived from nsr2db. */
export interface Recording {
  readonly recordId: RecordingId;
  readonly durationMs: number;
  readonly rrIntervalsMs: readonly number[];
}

/** Why an example recording could not be used; the interface turns each code into text. */
export const RECORDING_ERROR_CODES = [
  'invalid_format',
  'invalid_series',
  'invalid_interval',
  'duration_mismatch',
  'load_failed',
] as const;

export type RecordingErrorCode = (typeof RECORDING_ERROR_CODES)[number];

/** An example recording is malformed or could not be downloaded. */
export class RecordingError extends Error {
  readonly code: RecordingErrorCode;

  constructor(code: RecordingErrorCode) {
    super(`Example recording unusable: ${code}`);
    this.name = 'RecordingError';
    this.code = code;
  }
}

/** Rejects malformed files before they reach the acquisition channel. */
export function parseRecording(value: unknown, expectedId: RecordingId): Recording {
  if (typeof value !== 'object' || value === null || !('schemaVersion' in value)
    || value.schemaVersion !== RECORDING_SCHEMA_VERSION || !('recordId' in value) || value.recordId !== expectedId
    || !('durationMs' in value) || value.durationMs !== RECORDING_DURATION_MS
    || !('rrIntervalsMs' in value) || !Array.isArray(value.rrIntervalsMs)) {
    throw new RecordingError('invalid_format');
  }
  const intervals: readonly unknown[] = value.rrIntervalsMs;
  if (intervals.length === 0 || intervals.length > MAX_RECORDING_INTERVALS) {
    throw new RecordingError('invalid_series');
  }
  const rrIntervalsMs: number[] = [];
  let totalMs = 0;
  for (const rr of intervals) {
    if (typeof rr !== 'number' || !Number.isFinite(rr) || rr <= 0) {
      throw new RecordingError('invalid_interval');
    }
    totalMs += rr;
    rrIntervalsMs.push(rr);
  }
  if (totalMs > value.durationMs || totalMs < value.durationMs - RECORDING_DURATION_TOLERANCE_MS) {
    throw new RecordingError('duration_mismatch');
  }
  return { recordId: expectedId, durationMs: value.durationMs, rrIntervalsMs };
}

/** Only bundled public examples are fetched, with cancellation on disconnect. */
export async function loadRecording(id: RecordingId, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(recordingUrl(id), { signal });
  if (!response.ok) throw new RecordingError('load_failed');
  return response.json() as Promise<unknown>;
}
