import type { SessionRecord } from '../records/sessionRecord';

export interface HistoryFilters {
  readonly from: string;
  readonly to: string;
  readonly goal: string;
  readonly source: string;
  readonly withNotes: boolean;
}

export const EMPTY_FILTERS: HistoryFilters = { from: '', to: '', goal: '', source: '', withNotes: false };

function localDate(instant: string): string {
  const date = new Date(instant);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, '0')).join('-');
}

export function filterHistory(records: readonly SessionRecord[], filters: HistoryFilters): SessionRecord[] {
  return records.filter((record) => {
    const date = record.context?.localDate ?? localDate(record.startedAt);
    return (filters.from === '' || date >= filters.from) &&
      (filters.to === '' || date <= filters.to) &&
      (filters.goal === '' || record.goals.some((goal) => goal === filters.goal)) &&
      (filters.source === '' || (record.sourceKind ?? 'none') === filters.source) &&
      (!filters.withNotes || Boolean(record.note?.trim()));
  });
}
