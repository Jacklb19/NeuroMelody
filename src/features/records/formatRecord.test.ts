import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { formattersFor } from '../../i18n/formatters';
import { createRecordFormatter } from './formatRecord';

const format = createRecordFormatter(es, formattersFor('es'));
const { common, records } = es;
const minutes = (value: number): string => common.withUnit(String(value), common.units.minutes);

describe('createRecordFormatter', () => {
  it('rounds listening time down to whole minutes', () => {
    expect(format.listened(59)).toBe(records.lessThan(minutes(1)));
    expect(format.listened(1199)).toBe(minutes(19));
  });

  it('rounds signal time and keeps an empty phase at zero', () => {
    expect(format.signalTime(0)).toBe(minutes(0));
    expect(format.signalTime(20)).toBe(records.lessThan(minutes(1)));
    expect(format.signalTime(90)).toBe(minutes(2));
  });

  it('shows a change in whole units and a mark when there is no data', () => {
    expect(format.change({ start: 78.4, end: 67.6 }, common.units.beatsPerMinute)).toBe('78 → 68 lpm');
    expect(format.change(null, common.units.beatsPerMinute)).toBe(common.noValue);
  });

  it('shows skipped self-ratings without hiding the one that was answered', () => {
    expect(format.ratings(4, 7)).toBe('4 → 7');
    expect(format.ratings(null, 7)).toBe(records.change(common.noValue, '7'));
    expect(format.ratings(null, null)).toBe(records.noAnswer);
  });

  it('formats the LF/HF ratio with two decimals', () => {
    expect(format.ratio(0.375)).toBe('0,38');
    expect(format.ratio(null)).toBe(common.noValue);
  });
});
