/**
 * Reads `AudioContext.playbackStats` (Chrome 146 and later): the underrun
 * counter used to verify RNF-01. In browsers without the API it returns
 * `null` and the interface hides the metric.
 */
export interface PlaybackStatistics {
  /** Times the audio thread did not deliver its block in time. */
  readonly underruns: number;
  readonly underrunDurationS: number;
  /** Total played duration according to the browser. */
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
