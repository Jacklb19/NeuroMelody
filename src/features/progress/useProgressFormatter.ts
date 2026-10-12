import { useMemo } from 'react';
import { useFormatters, useMessages } from '../../i18n/messages';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { METRIC_UNITS, type Pair, type ProgressMetricId } from './progress';

/** How the figures of the progress metrics read, in the interface language. */
export interface ProgressFormatter {
  /** A value with the unit of its metric ("68 lpm", "7"), or the empty-value mark. */
  value(metric: ProgressMetricId, value: number | null, fractionDigits?: number): string;
  /** A value at the start and at the end of a session: "78 → 68 lpm", "4 → 7". */
  change(metric: ProgressMetricId, pair: Pair): string;
}

export function useProgressFormatter(): ProgressFormatter {
  const t = useMessages();
  const format = useFormatters();
  const records = useRecordFormatter();
  return useMemo(() => {
    const unitOf = (metric: ProgressMetricId): string | null => {
      const unit = METRIC_UNITS[metric];
      return unit === null ? null : t.common.units[unit];
    };
    return {
      value: (metric, value, fractionDigits = 0) => {
        if (value === null) return t.common.noValue;
        const figure = fractionDigits === 0 ? format.integer(value) : format.decimal(value, fractionDigits);
        const unit = unitOf(metric);
        return unit === null ? figure : t.common.withUnit(figure, unit);
      },
      change: (metric, pair) => {
        const unit = unitOf(metric);
        if (unit === null) return records.ratings(pair.start, pair.end);
        if (pair.start === null || pair.end === null) return t.common.noValue;
        return t.common.withUnit(t.records.change(format.integer(pair.start), format.integer(pair.end)), unit);
      },
    };
  }, [t, format, records]);
}
