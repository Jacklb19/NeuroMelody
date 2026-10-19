import { describe, expect, it } from 'vitest';
import type { InsightComparison } from '../progress/historyInsights';
import { personalChoices } from './personalPlan';
import { DEFAULT_DURATION_MIN, readDuration } from './plan';

const comparison = (dimension: InsightComparison['dimension'], value: string): InsightComparison => ({
  id: dimension, dimension, metric: 'rating', goal: 'relax', version: 1, source: null,
  groups: [], pair: [{ value, count: 5, median: 3 }, { value: 'other', count: 5, median: 1 }],
});

describe('personal plan choices', () => {
  const suggestions = [comparison('instrument', 'piano'), comparison('ambience', 'rain'), comparison('plannedDuration', '30')];
  it('applies only supported fields, with explicit links taking priority', () => {
    expect(personalChoices(suggestions, { instrument: true, ambience: false, duration: true })).toEqual({ ambience: 'rain' });
    expect(personalChoices(suggestions, { instrument: false, ambience: false, duration: false })).toEqual({ instrument: 'piano', ambience: 'rain', duration: 30 });
  });
  it('does not convert listening buckets or an invalid plan into a duration', () => {
    expect(personalChoices([comparison('duration', 'extended'), comparison('plannedDuration', '25')], { instrument: false, ambience: false, duration: false }).duration).toBeUndefined();
  });
  it('allows the quick exception, retains manual durations and validates incoming values', () => {
    expect(readDuration('3')).toBe(3);
    expect(readDuration('60')).toBe(60);
    for (const value of [null, '2', '3.5', 'NaN', 'Infinity', '120']) expect(readDuration(value)).toBe(DEFAULT_DURATION_MIN);
  });
});
