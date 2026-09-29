import type { ClassifiedBeat, LowQualitySegment } from './types';
import { MIN_ACCEPTANCE, QUALITY_WINDOW_MS } from './thresholds';

/**
 * Proporción de latidos aceptados entre los que terminan en los últimos
 * 30 s de señal; `null` si en ese intervalo no terminó ningún latido.
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

/** `true` si la proporción reciente de latidos aceptados es menor del 80 %. */
export function isAcceptanceLow(
  beats: readonly ClassifiedBeat[],
  currentTimeMs: number,
): boolean {
  const ratio = recentAcceptance(beats, currentTimeMs);
  return ratio !== null && ratio < MIN_ACCEPTANCE;
}

/**
 * Añade un tramo de baja calidad a una lista ordenada, fusionándolo con el
 * último si se solapan o se tocan, para no dibujar franjas fragmentadas.
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
