import type { SourceKind } from '../acquisition/sourceCatalog';
import { DURATIONS_MIN } from '../plan/plan';
import { measuredSessions } from '../records/retentionPolicy';
import type { SessionRecord } from '../records/sessionRecord';
import { SESSION_CONTEXT_VERSION } from '../records/sessionContext';
import { summarizeSession } from '../records/summarizeSession';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import { selectRange } from './progress';
import type { ProgressRangeId } from './progressRangeCatalog';

/** Product thresholds, not scientific significance or a claim of benefit (ADR-48). */
export const MIN_INSIGHT_SESSIONS = 5;
export const MAX_INSIGHT_OBSERVATIONS = 3;
export const INSIGHT_PRECISION = 10;
export const INSIGHT_DIMENSIONS = ['instrument', 'ambience', 'hour', 'duration', 'goal', 'plannedDuration'] as const;
export type InsightDimension = (typeof INSIGHT_DIMENSIONS)[number];
export const HOUR_BANDS = ['night', 'morning', 'afternoon', 'evening'] as const;
export const HOUR_BAND_WIDTH = 6;
export const DURATION_BANDS = [
  { id: 'short', from: 0 }, { id: 'medium', from: 10 }, { id: 'long', from: 20 }, { id: 'extended', from: 30 },
] as const;
export type InsightMetric = 'rating' | 'pulse';

export interface InsightGroup {
  readonly value: string;
  readonly count: number;
  readonly median: number;
}

/** Every group of a comparison shares its intention, program version and (for pulse) source. */
export interface InsightComparison {
  readonly id: string;
  readonly dimension: InsightDimension;
  readonly metric: InsightMetric;
  readonly goal: string;
  readonly version: number;
  readonly source: SourceKind | null;
  readonly groups: readonly InsightGroup[];
  /** A visible difference among two sufficiently populated groups, otherwise null. */
  readonly pair: readonly [InsightGroup, InsightGroup] | null;
}

export interface HistoryInsights {
  readonly comparisons: readonly InsightComparison[];
  readonly observations: readonly InsightComparison[];
  readonly knownDays: number;
  readonly unknownDates: number;
}

export function goalKey(goals: readonly string[]): string {
  return [...goals].sort().join(',');
}

function valueOf(record: SessionRecord, dimension: InsightDimension): string | null {
  switch (dimension) {
    case 'instrument': return record.context?.instrument ?? null;
    case 'ambience': return record.context?.ambience ?? null;
    case 'hour': return record.context === undefined ? null : HOUR_BANDS[Math.floor(record.context.localHour / HOUR_BAND_WIDTH)] ?? null;
    case 'duration': return [...DURATION_BANDS].reverse().find((band) => record.listenedSeconds / SECONDS_PER_MINUTE >= band.from)?.id ?? null;
    case 'goal': return goalKey(record.goals);
    // Actual listening buckets never become a proposed plan length.
    case 'plannedDuration': return DURATIONS_MIN.some((minutes) => minutes === record.plannedMinutes) ? String(record.plannedMinutes) : null;
  }
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : sorted[middle] ?? 0;
  const rounded = Math.round(value * INSIGHT_PRECISION) / INSIGHT_PRECISION;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function comparablePair(groups: readonly InsightGroup[], metric: InsightMetric): InsightComparison['pair'] {
  const eligible = groups.filter((group) => group.count >= MIN_INSIGHT_SESSIONS)
    .sort((left, right) => (metric === 'rating' ? right.median - left.median : left.median - right.median) || left.value.localeCompare(right.value));
  const first = eligible[0];
  const second = eligible.find((group) => first !== undefined && group.median !== first.median);
  // A tie for the leading option must never suggest an arbitrary winner.
  if (first === undefined || second === undefined || eligible[1]?.median === first.median) return null;
  return [first, second];
}

/** Excludes trials before the range, then computes figures; text and network never enter this function. */
export function historyInsights(records: readonly SessionRecord[], range: ProgressRangeId = 'all'): HistoryInsights {
  const selected = selectRange(measuredSessions([...records].sort((a, b) => b.startedAt.localeCompare(a.startedAt))), range);
  const prepared = selected.map((record) => ({ record, summary: summarizeSession(record) }));
  const comparisons: InsightComparison[] = [];
  for (const dimension of INSIGHT_DIMENSIONS) {
    for (const metric of ['rating', 'pulse'] as const) {
      const scopes = new Map<string, { goal: string; version: number; source: SourceKind | null; values: Map<string, number[]> }>();
      for (const { record, summary } of prepared) {
        if (metric === 'pulse' && record.sourceKind !== 'ble' && record.sourceKind !== 'camera') continue;
        // A watch's pulse is not compared with a strap's, even though both arrive over Bluetooth (ADR-51).
        if (metric === 'pulse' && record.signalMode === 'hr_only') continue;
        const value = valueOf(record, dimension);
        const change = metric === 'rating' ? summary.ratingChange : summary.heartRate === null ? null : summary.heartRate.end - summary.heartRate.start;
        if (value === null || change === null) continue;
        const goal = dimension === 'goal' ? '' : goalKey(record.goals);
        const version = record.context?.version ?? 0;
        const source = metric === 'pulse' ? record.sourceKind : null;
        const key = JSON.stringify([goal, version, source]);
        let scope = scopes.get(key);
        if (scope === undefined) {
          scope = { goal, version, source, values: new Map() };
          scopes.set(key, scope);
        }
        const changes = scope.values.get(value) ?? [];
        changes.push(change);
        scope.values.set(value, changes);
      }
      for (const [key, scope] of [...scopes].sort(([left], [right]) => left.localeCompare(right))) {
        const groups = [...scope.values].sort(([left], [right]) => left.localeCompare(right))
          .map(([value, changes]) => ({ value, count: changes.length, median: median(changes) }));
        comparisons.push({ id: `${dimension}:${metric}:${key}`, dimension, metric, goal: scope.goal, version: scope.version, source: scope.source, groups, pair: comparablePair(groups, metric) });
      }
    }
  }
  const knownDates = selected.flatMap((record) => record.context === undefined ? [] : [record.context.localDate]);
  return {
    comparisons,
    observations: comparisons.filter((comparison) => comparison.pair !== null).slice(0, MAX_INSIGHT_OBSERVATIONS),
    knownDays: new Set(knownDates).size,
    unknownDates: selected.length - knownDates.length,
  };
}

/** Choices the person makes before listening: the ones worth telling how close a first comparison is. */
const CHOSEN_DIMENSIONS: ReadonlySet<InsightDimension> = new Set(['instrument', 'ambience']);

export interface MissingSessions {
  readonly comparison: InsightComparison;
  /** The two most used options that still lack sessions, each with how many are missing. */
  readonly needs: readonly { readonly value: string; readonly missing: number }[];
}

/**
 * The rating comparison of a sound or ambience that needs the fewest sessions
 * to reach the minimum in its two most used options, or null when none is close.
 */
export function nextComparison(insights: HistoryInsights): MissingSessions | null {
  let best: MissingSessions | null = null;
  let fewest = Number.POSITIVE_INFINITY;
  for (const comparison of insights.comparisons) {
    if (comparison.metric !== 'rating' || comparison.version !== SESSION_CONTEXT_VERSION || !CHOSEN_DIMENSIONS.has(comparison.dimension)) continue;
    const top = [...comparison.groups].sort((left, right) => right.count - left.count || left.value.localeCompare(right.value)).slice(0, 2);
    if (top.length < 2) continue;
    const needs = top.map((group) => ({ value: group.value, missing: Math.max(0, MIN_INSIGHT_SESSIONS - group.count) }))
      .filter((need) => need.missing > 0);
    const missing = needs.reduce((total, need) => total + need.missing, 0);
    if (missing > 0 && missing < fewest) {
      best = { comparison, needs };
      fewest = missing;
    }
  }
  return best;
}

/** Only a positive, uniquely higher rating change can support an editable plan choice. */
export function personalComparisons(insights: HistoryInsights, goals: readonly string[]): readonly InsightComparison[] {
  const goal = goalKey(goals);
  return (['instrument', 'ambience', 'plannedDuration'] as const).flatMap((dimension) => {
    const candidates = insights.comparisons.filter((comparison) => comparison.dimension === dimension && comparison.metric === 'rating'
      && comparison.goal === goal && comparison.version === SESSION_CONTEXT_VERSION && comparison.pair !== null && comparison.pair[0].median > 0);
    return candidates.slice(0, 1);
  });
}
