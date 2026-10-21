import { describe, expect, it } from 'vitest';
import { sample, sessionRecord } from '../../test/sessionRecords';
import type { SessionRecord } from '../records/sessionRecord';
import { createSessionContext } from '../records/sessionContext';
import { historyInsights, nextComparison, personalComparisons } from './historyInsights';

const CONTEXT = createSessionContext('piano', 'rain', new Date(2026, 9, 19, 10));
function group(count: number, overrides: Partial<SessionRecord> = {}): SessionRecord[] {
  return Array.from({ length: count }, (_, index) => sessionRecord({
    id: `017f22e2-79b0-7000-8000-${String(index).padStart(12, '0')}`,
    goals: ['relax'], context: CONTEXT, ratingBefore: 4, ratingAfter: 7,
    samples: [sample(5, { meanHr: 80 }), sample(10, { meanHr: 70 })], ...overrides,
  }));
}
const other = (count = 5) => group(count, { context: { ...CONTEXT, instrument: 'warm' }, ratingAfter: 5 });
const instrument = (records: SessionRecord[]) => historyInsights(records).comparisons.find((item) => item.dimension === 'instrument' && item.metric === 'rating');

describe('historyInsights', () => {
  it('requires five observations on both sides, at the exact boundary', () => {
    expect(instrument([...group(5), ...other(4)])?.pair).toBeNull();
    expect(instrument([...group(5), ...other(5)])?.pair?.map((item) => [item.value, item.count, item.median])).toEqual([['piano', 5, 3], ['warm', 5, 1]]);
  });

  it('uses medians rather than a single extreme session', () => {
    const records = [...group(4, { ratingAfter: 5 }), ...group(1, { ratingAfter: 10 }), ...other(5).map((record) => ({ ...record, ratingAfter: 6 }))];
    expect(instrument(records)?.pair?.map((item) => item.median)).toEqual([2, 1]);
  });

  it('requires both ratings, and never recommends a tied or nonpositive change', () => {
    expect(instrument([...group(5, { ratingAfter: null }), ...other()])?.pair).toBeNull();
    const tied = [...group(5, { ratingAfter: 5 }), ...other()];
    expect(instrument(tied)?.pair).toBeNull();
    expect(personalComparisons(historyInsights(tied), ['relax'])).toEqual([]);
    const negative = [...group(5, { ratingAfter: 3 }), ...other().map((record) => ({ ...record, ratingAfter: 2 }))];
    expect(personalComparisons(historyInsights(negative), ['relax'])).toEqual([]);
  });

  it('does not pick a winner when two leading groups tie', () => {
    const tiedLeaders = [...group(5), ...group(5, { context: { ...CONTEXT, instrument: 'bowls' } }), ...other()];
    expect(instrument(tiedLeaders)?.pair).toBeNull();
  });

  it('never fills missing context or pools different intentions and versions', () => {
    expect(instrument([...group(5, { context: undefined }), ...other()])?.pair).toBeNull();
    expect(instrument([...group(5, { goals: ['pause'] }), ...other()])?.pair).toBeNull();
    expect(personalComparisons(historyInsights([...group(5, { goals: ['pause'] }), ...other()]), ['relax'])).toEqual([]);
  });

  it('separates pulse sources and drops low-quality or missing endpoints', () => {
    const records = [...group(5), ...other().map((record) => ({ ...record, sourceKind: 'camera' as const }))];
    expect(historyInsights(records).comparisons.filter((item) => item.metric === 'pulse' && item.dimension === 'instrument').every((item) => item.pair === null)).toBe(true);
    const lowQuality = group(5, { samples: [sample(5, { goodQuality: false }), sample(10, { meanHr: 55 })] });
    expect(historyInsights(lowQuality).comparisons.filter((item) => item.metric === 'pulse')).toEqual([]);
    expect(historyInsights(group(5, { sourceKind: null })).comparisons.filter((item) => item.metric === 'pulse')).toEqual([]);
  });

  it('excludes trial sessions before selecting a range', () => {
    const records = [...group(30, { sourceKind: 'simulator' }), ...group(5), ...other()];
    expect(historyInsights(records, 'last30').observations.some((item) => item.dimension === 'instrument')).toBe(true);
    expect(historyInsights(records, 'last7').observations).toEqual([]);
    expect(historyInsights(group(5, { sourceKind: 'recording' })).comparisons).toEqual([]);
  });

  it('groups the recorded local hour and actual listening time at their boundaries', () => {
    const records = [0, 6, 12, 18].map((hour, index) => sessionRecord({ context: { ...CONTEXT, localHour: hour }, listenedSeconds: [0, 600, 1200, 1800][index] ?? 0 }));
    const comparisons = historyInsights(records).comparisons;
    expect(comparisons.find((item) => item.dimension === 'hour')?.groups.map((item) => item.value)).toEqual(['afternoon', 'evening', 'morning', 'night']);
    expect(comparisons.find((item) => item.dimension === 'duration')?.groups.map((item) => item.value)).toEqual(['extended', 'long', 'medium', 'short']);
  });

  it('only suggests a catalog plan from planned durations, never from time listened', () => {
    const records = [...group(5, { listenedSeconds: 180, plannedMinutes: 20 }), ...group(5, { listenedSeconds: 1800, plannedMinutes: 10, ratingAfter: 5 })];
    const proposal = personalComparisons(historyInsights(records), ['relax']);
    expect(proposal.find((item) => item.dimension === 'plannedDuration')?.pair?.[0].value).toBe('20');
    expect(historyInsights(group(5, { plannedMinutes: 3 })).comparisons.some((item) => item.dimension === 'plannedDuration')).toBe(false);
  });

  it('counts only recorded local dates and limits observations deterministically', () => {
    const result = historyInsights([...group(5), ...other(), sessionRecord()]);
    expect(result.knownDays).toBe(1);
    expect(result.unknownDates).toBe(1);
    expect(result.observations.length).toBeLessThanOrEqual(3);
    expect(historyInsights([])).toEqual({ comparisons: [], observations: [], knownDays: 0, unknownDates: 0 });
  });
});

describe('nextComparison', () => {
  const needs = (records: SessionRecord[]) => nextComparison(historyInsights(records));
  it('tells what the two most used sounds still lack, and nothing once a comparison is complete or impossible', () => {
    expect(needs([...group(5), ...other(3)])?.needs).toEqual([{ value: 'warm', missing: 2 }]);
    expect(needs([...group(3), ...other(4)])?.needs).toEqual([{ value: 'warm', missing: 1 }, { value: 'piano', missing: 2 }]);
    expect(needs(group(4))).toBeNull();
    expect(needs([...group(5, { ratingAfter: 5 }), ...other()])).toBeNull();
  });
});
