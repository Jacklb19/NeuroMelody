import type { SourceKind } from '../acquisition/sourceCatalog';
import { GOAL_IDS, type GoalId } from '../plan/goalCatalog';
import { PROGRESS_METRIC_IDS, progressOf, type Pair, type Progress, type ProgressMetricId } from '../progress/progress';
import type { SessionRecord } from '../records/sessionRecord';

/**
 * Sources whose figures are not the person's: the simulator invents a pulse
 * and the sample recordings belong to somebody else. The report names them,
 * so nobody reads those sessions as measurements.
 */
export const DEMO_SOURCE_KINDS: readonly SourceKind[] = ['simulator', 'recording'];

/** Decimals of each average: the self-rating moves within ten points, so tenths matter there. */
export const AVERAGE_DECIMALS: Readonly<Record<ProgressMetricId, number>> = {
  heartRate: 0,
  variability: 0,
  rating: 1,
};

/** One session of the report's table. */
export interface ReportRow {
  readonly id: string;
  readonly startedAt: string;
  readonly listenedSeconds: number;
  readonly sourceKind: SourceKind | null;
  readonly values: Readonly<Record<ProgressMetricId, Pair>>;
}

/** How often a goal was chosen in the sessions of the report. */
export interface GoalCount {
  readonly id: GoalId;
  readonly sessions: number;
}

/** What the printable report of a range of sessions shows (ADR-33). Descriptive figures only. */
export interface Report {
  readonly progress: Progress;
  /** Start of the most recent session; `null` without sessions. With `progress.since` it is the period covered. */
  readonly until: string | null;
  /**
   * Mean of each metric at the start and at the end, over the sessions that
   * have both values (the ones `progress.tallies` compares); `null` without any.
   */
  readonly averages: Readonly<Record<ProgressMetricId, Pair>>;
  /** Goals chosen at least once, the most chosen first; ties keep the catalog order. */
  readonly goals: readonly GoalCount[];
  /** Oldest first, like the charts. */
  readonly rows: readonly ReportRow[];
  /** Sessions made with a source of `DEMO_SOURCE_KINDS`. */
  readonly demoSessions: number;
}

function averageOf(rows: readonly ReportRow[], metric: ProgressMetricId): Pair {
  let compared = 0;
  let start = 0;
  let end = 0;
  for (const { values } of rows) {
    const pair = values[metric];
    if (pair.start === null || pair.end === null) continue;
    compared++;
    start += pair.start;
    end += pair.end;
  }
  return compared === 0 ? { start: null, end: null } : { start: start / compared, end: end / compared };
}

/** The report of the given sessions (newest first, as the store lists them). */
export function reportOf(records: readonly SessionRecord[]): Report {
  const progress = progressOf(records);
  const byId = new Map(records.map((record) => [record.id, record]));
  const rows = progress.points.flatMap((point): ReportRow[] => {
    const record = byId.get(point.id);
    return record === undefined ? [] : [{
      id: point.id,
      startedAt: point.startedAt,
      listenedSeconds: record.listenedSeconds,
      sourceKind: record.sourceKind,
      values: point.values,
    }];
  });
  const goals = GOAL_IDS
    .map((id): GoalCount => ({ id, sessions: records.filter((record) => record.goals.includes(id)).length }))
    .filter((goal) => goal.sessions > 0)
    // The sort is stable, so equal counts stay in catalog order.
    .sort((a, b) => b.sessions - a.sessions);
  const [heartRate, variability, rating] = PROGRESS_METRIC_IDS.map((metric) => averageOf(rows, metric));
  return {
    progress,
    until: rows[rows.length - 1]?.startedAt ?? null,
    averages: {
      heartRate: heartRate ?? { start: null, end: null },
      variability: variability ?? { start: null, end: null },
      rating: rating ?? { start: null, end: null },
    },
    goals,
    rows,
    demoSessions: records.filter((record) => record.sourceKind !== null && DEMO_SOURCE_KINDS.includes(record.sourceKind)).length,
  };
}
