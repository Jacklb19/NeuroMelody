import { describe, expect, it } from 'vitest';
import { readGoals } from './goalCatalog';

describe('readGoals', () => {
  it('keeps known goals in catalog order, once each, and drops the rest', () => {
    expect(readGoals('pause, relax,unknown,relax')).toEqual(['relax', 'pause']);
  });

  it('chooses no goal when the URL has none', () => {
    expect(readGoals(null)).toEqual([]);
    expect(readGoals('')).toEqual([]);
  });
});
