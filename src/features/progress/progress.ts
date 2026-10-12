import type { Messages } from '../../i18n/messages';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import { roundDomain, type Domain } from '../../shared/trendChartGeometry';
import { MAX_RATING, MIN_RATING, type SessionRecord } from '../records/sessionRecord';
import { summarizeSession, type Change } from '../records/summarizeSession';
import { PROGRESS_RANGE_SIZES, type ProgressRangeId } from './progressRangeCatalog';

/** What the progress view follows across sessions (ADR-33). */
export const PROGRESS_METRIC_IDS = ['heartRate', 'variability', 'rating'] as const;

export type ProgressMetricId = (typeof PROGRESS_METRIC_IDS)[number];

/** The change each metric's sentence counts: a pulse that ended lower, a variability or a self-rating that ended higher. */
export const INSIGHT_DIRECTION: Readonly<Record<ProgressMetricId, 'lower' | 'higher'>> = {
  heartRate: 'lower',
  variability: 'higher',
  rating: 'higher',
};

/** Unit of each metric, as a key of the dictionary's units; the self-rating has none. */
export const METRIC_UNITS: Readonly<Record<ProgressMetricId, keyof Messages['common']['units'] | null>> = {
  heartRate: 'beatsPerMinute',
  variability: 'milliseconds',
  rating: null,
};

/**
 * Vertical axis of each chart: the whole scale of the self-rating, or round
 * figures every `step` around the values measured.
 */
export const METRIC_AXES: Readonly<Record<ProgressMetricId, Domain | { readonly step: number }>> = {
  heartRate: { step: 10 },
  variability: { step: 10 },
  rating: { min: MIN_RATING, max: MAX_RATING },
};

/** A value when the session started and when it ended; either can be missing. */
export interface Pair {
  readonly start: number | null;
  readonly end: number | null;
}

/** One session on the charts. */
export interface ProgressPoint {
  readonly id: string;
  readonly startedAt: string;
  readonly values: Readonly<Record<ProgressMetricId, Pair>>;
}

/** How a metric ended compared with how it started, counted over the sessions that have both values. */
export interface Tally {
  readonly compared: number;
  readonly lower: number;
  readonly higher: number;
}

export interface Progress {
  readonly sessions: number;
  /** Whole minutes listened across the sessions shown. */
  readonly minutes: number;
  /** Start of the oldest session shown; `null` without sessions. */
  readonly since: string | null;
  /** Oldest first, the order the charts read in. */
  readonly points: readonly ProgressPoint[];
  readonly tallies: Readonly<Record<ProgressMetricId, Tally>>;
}

/** The most recent sessions of a range; `records` come newest first, as the store lists them. */
export function selectRange(records: readonly SessionRecord[], range: ProgressRangeId): readonly SessionRecord[] {
  const size = PROGRESS_RANGE_SIZES[range];
  return size === null ? records : records.slice(0, size);
}

/** Whole figures, as the screen shows them: a change the person cannot see is not counted as one. */
function rounded(change: Change | null): Pair {
  return change === null ? { start: null, end: null } : { start: Math.round(change.start), end: Math.round(change.end) };
}

function tallyOf(points: readonly ProgressPoint[], metric: ProgressMetricId): Tally {
  let compared = 0;
  let lower = 0;
  let higher = 0;
  for (const { values } of points) {
    const { start, end } = values[metric];
    if (start === null || end === null) continue;
    compared++;
    if (end < start) lower++;
    if (end > start) higher++;
  }
  return { compared, lower, higher };
}

/** Axis of a metric's chart for the sessions shown; `null` when none has a value to draw. */
export function axisOf(metric: ProgressMetricId, points: readonly ProgressPoint[]): Domain | null {
  const values = points.flatMap((point) => [point.values[metric].start, point.values[metric].end]);
  if (values.every((value) => value === null)) return null;
  const axis = METRIC_AXES[metric];
  return 'step' in axis ? roundDomain(values, axis.step) : axis;
}

/**
 * Evolution across the given sessions (newest first): the pulse and the
 * variability at both ends of each one, and how the person said they felt
 * before and after. Descriptive figures; it draws no conclusion from them.
 */
export function progressOf(records: readonly SessionRecord[]): Progress {
  const points = [...records].reverse().map((record): ProgressPoint => {
    const summary = summarizeSession(record);
    return {
      id: record.id,
      startedAt: record.startedAt,
      values: {
        heartRate: rounded(summary.heartRate),
        variability: rounded(summary.rmssd),
        rating: { start: record.ratingBefore, end: record.ratingAfter },
      },
    };
  });
  const seconds = records.reduce((sum, record) => sum + record.listenedSeconds, 0);
  return {
    sessions: records.length,
    minutes: Math.floor(seconds / SECONDS_PER_MINUTE),
    since: points[0]?.startedAt ?? null,
    points,
    tallies: {
      heartRate: tallyOf(points, 'heartRate'),
      variability: tallyOf(points, 'variability'),
      rating: tallyOf(points, 'rating'),
    },
  };
}
