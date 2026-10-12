import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../audio/engine/levels';
import { BREATH_CYCLE_BEATS, EXHALE_BEATS, INHALE_BEATS, beatsIn, breathAt } from './breathingPattern';

describe('breathAt', () => {
  it('fills while breathing in and empties while breathing out', () => {
    expect(breathAt(0)).toEqual({ phase: 'inhale', fullness: 0 });
    expect(breathAt(INHALE_BEATS / 2).fullness).toBeCloseTo(0.5);
    expect(breathAt(INHALE_BEATS)).toEqual({ phase: 'exhale', fullness: 1 });
    expect(breathAt(INHALE_BEATS + EXHALE_BEATS / 2).fullness).toBeCloseTo(0.5);
    expect(breathAt(BREATH_CYCLE_BEATS - 0.001).phase).toBe('exhale');
    expect(breathAt(BREATH_CYCLE_BEATS - 0.001).fullness).toBeCloseTo(0, 5);
  });

  it('repeats every cycle', () => {
    expect(breathAt(BREATH_CYCLE_BEATS)).toEqual(breathAt(0));
    expect(breathAt(3 * BREATH_CYCLE_BEATS + 5)).toEqual(breathAt(5));
  });
});

describe('beatsIn', () => {
  it('makes a cycle of about ten seconds at the target tempo and a shorter one when the music is faster', () => {
    const cycleSeconds = (tempo: number): number => BREATH_CYCLE_BEATS / beatsIn(1, tempo);
    expect(cycleSeconds(LEVELS.target.tempo)).toBeCloseTo(10.17, 2);
    expect(cycleSeconds(LEVELS.high.tempo)).toBeLessThan(cycleSeconds(LEVELS.intermediate.tempo));
  });

  it('ignores a clock that goes backwards', () => {
    expect(beatsIn(-2, LEVELS.target.tempo)).toBe(0);
  });
});
