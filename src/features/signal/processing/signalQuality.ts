import type { ClassifiedBeat, LowQualitySegment } from './types';
import { MIN_ACCEPTANCE, QUALITY_WINDOW_MS } from './thresholds';

/**
 * Proportion of accepted beats among those ending in the last 30 s of
 * signal; `null` if no beat ended in that interval.
 */
export function recentAcceptance(
  beats: readonly ClassifiedBeat[],
  currentTimeMs: number,
): number | null {
  const fromMs = currentTimeMs - QUALITY_WINDOW_MS;
  let total = 0;
  let acceptedCount = 0;
  for (const beat of beats) {
    if (beat.endMs > fromMs && beat.endMs <= currentTimeMs) {
      total++;
      if (beat.accepted) {
        acceptedCount++;
      }
    }
  }
  return total === 0 ? null : acceptedCount / total;
}

/** `true` if the recent proportion of accepted beats is below 80 %. */
export function isAcceptanceLow(
  beats: readonly ClassifiedBeat[],
  currentTimeMs: number,
): boolean {
  const ratio = recentAcceptance(beats, currentTimeMs);
  return ratio !== null && ratio < MIN_ACCEPTANCE;
}

/**
 * Appends a low-quality segment to a sorted list, merging it with the last
 * one if they overlap or touch, so the chart does not draw fragmented bands.
 */
export function addSegment(
  segments: readonly LowQualitySegment[],
  incoming: LowQualitySegment,
): LowQualitySegment[] {
  const last = segments.at(-1);
  if (last !== undefined && incoming.startMs <= last.endMs) {
    return [
      ...segments.slice(0, -1),
      { startMs: last.startMs, endMs: Math.max(last.endMs, incoming.endMs) },
    ];
  }
  return [...segments, incoming];
}
