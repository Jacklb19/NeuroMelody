import { describe, expect, it } from 'vitest';
import { LEVEL_IDS, LEVELS } from '../audio/engine/levels';
import { MAX_TEMPO_BPM, MIN_TEMPO_BPM } from '../audio/worklet/workletContract';
import { DEFAULT_GUIDANCE_RANGE, type GuidanceRange } from './AdaptationEngine';
import {
  PERSONAL_TEMPO_MAX_FALL_BPM,
  PERSONAL_TEMPO_MAX_RISE_BPM,
  personalTempo,
  personalTempos,
  startTempoOffset,
} from './personalTempo';

const FROM_HIGH: GuidanceRange = { startLevel: 'high', calmestLevel: 'target' };

describe('personal tempo', () => {
  it('moves the start level to the pulse, within the allowed distance', () => {
    expect(startTempoOffset(72, 'intermediate')).toBe(6);
    expect(startTempoOffset(63.4, 'intermediate')).toBe(-3);
    expect(startTempoOffset(120, 'intermediate')).toBe(PERSONAL_TEMPO_MAX_RISE_BPM);
    expect(startTempoOffset(40, 'intermediate')).toBe(-PERSONAL_TEMPO_MAX_FALL_BPM);
    expect(startTempoOffset(88, 'high')).toBe(12);
  });

  it('leaves a session that starts at the target, or has no valid pulse, as the catalogue defines it', () => {
    expect(startTempoOffset(90, 'target')).toBe(0);
    expect(startTempoOffset(Number.NaN, 'intermediate')).toBe(0);
  });

  it('gives the whole offset to the start level and above, a share below, and none to the target', () => {
    expect(personalTempos(DEFAULT_GUIDANCE_RANGE, 10)).toEqual({ high: 86, intermediate: 76, target: 59, sleep: 50 });
    expect(personalTempos(FROM_HIGH, 10)).toEqual({ high: 86, intermediate: 71, target: 59, sleep: 50 });
    expect(personalTempo('intermediate', { startLevel: 'intermediate', calmestLevel: 'intermediate' }, -4)).toBe(62);
  });

  it.each([DEFAULT_GUIDANCE_RANGE, FROM_HIGH])('keeps the ladder in order and inside the synthesizer range at both extremes', (range) => {
    for (const offset of [-PERSONAL_TEMPO_MAX_FALL_BPM, PERSONAL_TEMPO_MAX_RISE_BPM]) {
      const tempos = LEVEL_IDS.map((level) => personalTempo(level, range, offset));
      expect([...tempos].sort((a, b) => b - a)).toEqual(tempos);
      // The pulse never pushes a level below the catalogue's slowest tempo.
      expect(Math.min(...tempos)).toBe(LEVELS.sleep.tempo);
      expect(Math.min(...tempos)).toBeGreaterThanOrEqual(MIN_TEMPO_BPM);
      expect(Math.max(...tempos)).toBeLessThanOrEqual(MAX_TEMPO_BPM);
    }
  });
});
