import { LEVEL_IDS, LEVELS, TARGET_LEVEL, type LevelId } from '../audio/engine/levels';
import type { GuidanceRange } from './AdaptationEngine';

/**
 * The music starts at the person's own pulse (ADR-39): the tempo of the level
 * a session starts at moves to the measured heart rate, and the levels below
 * it lead from there down to the tempo of the target, which stays fixed.
 * This is the iso principle of docs/diseno-musical.md with the real figure.
 */

/** Farthest the starting tempo may move above and below the level's own, in beats per minute. */
export const PERSONAL_TEMPO_MAX_RISE_BPM = 14;
export const PERSONAL_TEMPO_MAX_FALL_BPM = 5;
/** Good readings averaged before the pulse is trusted for a first adjustment; calibration refines it. */
export const PERSONAL_TEMPO_MIN_READINGS = 3;

/**
 * Whole beats per minute to add to the tempo of the start level so it sits
 * at the person's pulse, within the allowed distance. A session that starts
 * at the target is not moved: that tempo is a destination, not a starting point.
 */
export function startTempoOffset(pulseBpm: number, startLevel: LevelId): number {
  if (startLevel === TARGET_LEVEL || !Number.isFinite(pulseBpm)) {
    return 0;
  }
  const distance = pulseBpm - LEVELS[startLevel].tempo;
  return Math.round(Math.min(PERSONAL_TEMPO_MAX_RISE_BPM, Math.max(-PERSONAL_TEMPO_MAX_FALL_BPM, distance)));
}

/**
 * Tempo of `level` in a session whose start level moved by `offsetBpm`: the
 * whole offset at the start level and above it, a shrinking share on each
 * step below, and none at the target.
 */
export function personalTempo(level: LevelId, range: GuidanceRange, offsetBpm: number): number {
  const index = LEVEL_IDS.indexOf(level);
  const start = LEVEL_IDS.indexOf(range.startLevel);
  const target = LEVEL_IDS.indexOf(TARGET_LEVEL);
  const share = index <= start ? 1 : (target - index) / (target - start);
  return LEVELS[level].tempo + offsetBpm * share;
}

/** The tempo of every level for a session, as the audio engine takes them. */
export function personalTempos(range: GuidanceRange, offsetBpm: number): Record<LevelId, number> {
  return {
    high: personalTempo('high', range, offsetBpm),
    intermediate: personalTempo('intermediate', range, offsetBpm),
    target: personalTempo('target', range, offsetBpm),
  };
}
