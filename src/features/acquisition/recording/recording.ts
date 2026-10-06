export const RECORDING_IDS = ['nsr001', 'nsr002'] as const;
export type RecordingId = typeof RECORDING_IDS[number];

/** Validated, same-origin example data derived from nsr2db. */
export interface Recording {
  readonly recordId: RecordingId;
  readonly durationMs: number;
  readonly rrIntervalsMs: readonly number[];
}

/** Rejects malformed files before they reach the acquisition channel. */
export function parseRecording(value: unknown, expectedId: RecordingId): Recording {
  if (typeof value !== 'object' || value === null || !('schemaVersion' in value)
    || value.schemaVersion !== 1 || !('recordId' in value) || value.recordId !== expectedId
    || !('durationMs' in value) || value.durationMs !== 1800_000
    || !('rrIntervalsMs' in value) || !Array.isArray(value.rrIntervalsMs)) {
    throw new Error('El registro de ejemplo no tiene un formato válido.');
  }
  const intervals: readonly unknown[] = value.rrIntervalsMs;
  if (intervals.length === 0 || intervals.length > 10_000) {
    throw new Error('El registro de ejemplo no contiene una serie válida.');
  }
  const rrIntervalsMs: number[] = [];
  let totalMs = 0;
  for (const rr of intervals) {
    if (typeof rr !== 'number' || !Number.isFinite(rr) || rr <= 0) {
      throw new Error('El registro contiene un intervalo no válido.');
    }
    totalMs += rr;
    rrIntervalsMs.push(rr);
  }
  if (totalMs > value.durationMs || totalMs < value.durationMs - 3000) {
    throw new Error('La duración del registro no coincide con sus intervalos.');
  }
  return { recordId: expectedId, durationMs: value.durationMs, rrIntervalsMs };
}

/** Only bundled public examples are fetched, with cancellation on disconnect. */
export async function loadRecording(id: RecordingId, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`/recordings/${id}.json`, { signal });
  if (!response.ok) throw new Error('No se pudo cargar el registro de ejemplo.');
  return response.json() as Promise<unknown>;
}
