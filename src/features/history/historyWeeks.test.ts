import { describe, expect, it } from 'vitest';
import { sessionRecord } from '../../test/sessionRecords';
import { groupByWeek, weekStart } from './historyWeeks';

const at = (day: number, hour = 10) => sessionRecord({ id: `017f22e2-79b0-7000-8000-${String(day * 100 + hour).padStart(12, '0')}`, startedAt: new Date(2026, 9, day, hour).toISOString() });

describe('groupByWeek', () => {
  it('starts weeks on Monday at local midnight, including a Sunday late at night', () => {
    expect(weekStart(new Date(2026, 9, 25, 23, 59))).toEqual(new Date(2026, 9, 19));
    expect(weekStart(new Date(2026, 9, 19, 0, 0))).toEqual(new Date(2026, 9, 19));
  });

  it('names this week, the last one and older ones, newest first and keeping the given order', () => {
    // Tuesday 20 Oct 2026; Monday 19 Oct opens this week.
    const weeks = groupByWeek([at(20), at(19, 8), at(18, 22), at(12), at(5)], new Date(2026, 9, 20, 12));
    expect(weeks.map((week) => [week.label.kind, week.records.length])).toEqual([['this', 2], ['last', 2], ['of', 1]]);
    expect(weeks[2]?.label).toEqual({ kind: 'of', start: new Date(2026, 9, 5) });
    expect(weeks[0]?.records.map((record) => record.startedAt)).toEqual([at(20).startedAt, at(19, 8).startedAt]);
  });
});
