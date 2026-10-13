import { describe, expect, it } from 'vitest';
import { LEVEL_IDS } from '../audio/engine/levels';
import { GOAL_IDS } from './goalCatalog';
import { DEFAULT_PROGRAM, PROGRAMS, programFor } from './programCatalog';

describe('session programs', () => {
  it.each(GOAL_IDS)('%s starts no calmer than the calmest level it allows', (goal) => {
    const { startLevel, calmestLevel } = PROGRAMS[goal];
    expect(LEVEL_IDS.indexOf(startLevel)).toBeLessThanOrEqual(LEVEL_IDS.indexOf(calmestLevel));
  });

  it('gives a session without a goal the default program and reads several goals by the first', () => {
    expect(programFor([])).toBe(DEFAULT_PROGRAM);
    expect(programFor(['pause'])).toBe(PROGRAMS.pause);
    expect(programFor(['calm_after_activity', 'pause'])).toBe(PROGRAMS.calm_after_activity);
  });
});
