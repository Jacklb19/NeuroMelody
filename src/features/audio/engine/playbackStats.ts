/**
 * Lectura de `AudioContext.playbackStats` (Chrome 146 en adelante): el
 * contador de subdesbordamientos con el que se verifica RNF-01. En los
 * navegadores sin la API devuelve `null` y la interfaz oculta la métrica.
 */
export interface PlaybackStatistics {
  /** Veces que el hilo de audio no entregó su bloque a tiempo. */
  readonly underruns: number;
  readonly underrunDurationS: number;
  /** Duración total reproducida según el navegador. */
  readonly totalDurationS: number;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readPlaybackStats(context: unknown): PlaybackStatistics | null {
  if (!isRecord(context) || !isRecord(context.playbackStats)) {
    return null;
  }
  const { underrunEvents, underrunDuration, totalDuration } = context.playbackStats;
  const underruns = finiteOrNull(underrunEvents);
  const underrunDurationS = finiteOrNull(underrunDuration);
  const totalDurationS = finiteOrNull(totalDuration);
  if (underruns === null || underrunDurationS === null || totalDurationS === null) {
    return null;
  }
  return { underruns, underrunDurationS, totalDurationS };
}
