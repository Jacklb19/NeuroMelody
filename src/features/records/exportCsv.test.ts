import { describe, expect, it } from 'vitest';
import { APP_NAME, DOWNLOAD_FILE_PREFIX } from '../../config/app';
import { es } from '../../i18n/es';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { CSV_COLUMNS, csvFileName, sessionToCsv } from './exportCsv';

const { csv } = es.records;

describe('sessionToCsv', () => {
  it('writes the session details and one row per sample', () => {
    const record = sessionRecord({
      ratingAfter: null,
      samples: [
        sample(5, { meanHr: 62.12345, rmssd: 45.6, sdnn: 40, lfHfRatio: null, estimatedState: null }),
        sample(10, { estimatedState: 'low', goodQuality: false }),
      ],
    });
    const lines = sessionToCsv(record, es).trimEnd().split('\n');

    expect(lines[0]).toBe(`# ${csv.title(APP_NAME, record.id)}`);
    expect(lines).toContain(`# ${csv.fields.ratingBefore}: 4`);
    expect(lines).toContain(`# ${csv.fields.ratingAfter}: `);
    expect(lines).toContain(`# ${csv.disclaimer}`);
    expect(lines.slice(-3)).toEqual([
      CSV_COLUMNS.map((column) => csv.columns[column]).join(','),
      '5,62.123,45.6,40,,,1',
      `10,70,30,35,1,"${es.adaptation.states.low.toLowerCase()}",0`,
    ]);
  });

  it('names a column for every value of a row', () => {
    for (const column of CSV_COLUMNS) {
      expect(csv.columns[column].trim()).not.toBe('');
    }
  });

  it('names the file after the start instant without colons', () => {
    expect(csvFileName(sessionRecord(), es)).toBe(`${csv.fileName(DOWNLOAD_FILE_PREFIX, '2026-10-07T10-00-00')}.csv`);
  });
});
