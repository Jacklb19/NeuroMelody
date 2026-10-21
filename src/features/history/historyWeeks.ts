import type { SessionRecord } from '../records/sessionRecord';

const DAYS_PER_WEEK = 7;
/** Turns `Date.getDay()` (Sunday is 0) into days since Monday. */
const DAYS_SINCE_MONDAY_SHIFT = 6;

/** How a week of the history is named: relative while it is recent, by its first day afterwards. */
export type WeekLabel =
  | { readonly kind: 'this' }
  | { readonly kind: 'last' }
  | { readonly kind: 'of'; readonly start: Date };

export interface HistoryWeek {
  readonly key: string;
  readonly label: WeekLabel;
  readonly records: readonly SessionRecord[];
}

/** Monday at 00:00, local time, of the week a moment belongs to. */
export function weekStart(moment: Date): Date {
  const start = new Date(moment.getFullYear(), moment.getMonth(), moment.getDate());
  start.setDate(start.getDate() - ((start.getDay() + DAYS_SINCE_MONDAY_SHIFT) % DAYS_PER_WEEK));
  return start;
}

/**
 * Sessions grouped by local week, Monday first, newest week first. The order
 * of the sessions inside each week is kept as given.
 */
export function groupByWeek(records: readonly SessionRecord[], now: Date): HistoryWeek[] {
  const current = weekStart(now).getTime();
  // The moment before this Monday belongs to the previous week, whatever the clock change.
  const previous = weekStart(new Date(current - 1)).getTime();
  const weeks = new Map<number, SessionRecord[]>();
  for (const record of records) {
    const start = weekStart(new Date(record.startedAt)).getTime();
    const week = weeks.get(start) ?? [];
    week.push(record);
    weeks.set(start, week);
  }
  return [...weeks].sort(([left], [right]) => right - left).map(([start, items]) => ({
    key: String(start),
    label: start === current ? { kind: 'this' } : start === previous ? { kind: 'last' } : { kind: 'of', start: new Date(start) },
    records: items,
  }));
}
