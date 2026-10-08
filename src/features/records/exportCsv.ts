import { APP_NAME, DOWNLOAD_FILE_PREFIX } from '../../config/app';
import type { Messages } from '../../i18n/messages';
import type { SessionRecord, SessionSample } from './sessionRecord';

/** Media type of the downloaded file; UTF-8 keeps accents intact in spreadsheets. */
export const CSV_MIME_TYPE = 'text/csv;charset=utf-8';

const CSV_EXTENSION = '.csv';

/** Decimals kept for the indices: enough for analysis without float noise. */
const CSV_DECIMALS = 3;
const ROUNDING_FACTOR = 10 ** CSV_DECIMALS;

/** Spreadsheets and scripts skip lines that start with this mark. */
const COMMENT_MARK = '# ';

/** Values of the quality column, readable as booleans by any tool. */
const GOOD_QUALITY = '1';
const POOR_QUALITY = '0';

/** Characters of an ISO 8601 instant up to its seconds: `YYYY-MM-DDTHH:mm:ss`. */
const ISO_SECONDS_LENGTH = 'YYYY-MM-DDTHH:mm:ss'.length;

/** Columns of the data rows, in file order; their names come from the dictionary. */
export const CSV_COLUMNS = ['second', 'meanHr', 'rmssd', 'sdnn', 'lfHfRatio', 'estimatedState', 'goodQuality'] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

function cell(value: number | string | null): string {
  if (value === null) return '';
  if (typeof value === 'number') return String(Math.round(value * ROUNDING_FACTOR) / ROUNDING_FACTOR);
  // Quotes every text cell so commas or quotes inside it cannot break the row.
  return `"${value.replaceAll('"', '""')}"`;
}

const optional = (value: number | null): string => (value === null ? '' : String(value));

/** Cells of one sample, keyed by column so the order lives only in `CSV_COLUMNS`. */
function sampleCells(sample: SessionSample, t: Messages): Readonly<Record<CsvColumn, string>> {
  return {
    second: cell(sample.second),
    meanHr: cell(sample.meanHr),
    rmssd: cell(sample.rmssd),
    sdnn: cell(sample.sdnn),
    lfHfRatio: cell(sample.lfHfRatio),
    // The state is written in lower case, as a value rather than a heading.
    estimatedState: sample.estimatedState === null ? '' : cell(t.adaptation.states[sample.estimatedState].toLowerCase()),
    goodQuality: sample.goodQuality ? GOOD_QUALITY : POOR_QUALITY,
  };
}

/**
 * Builds the downloadable CSV of a session (RF-15): commented header lines
 * with the session details, then one row per sample (every `COMPUTE_PERIOD_S`
 * of signal). Column names and comments come from the dictionary because the
 * file is meant for the person and their therapist; numbers use a dot so
 * spreadsheets and scripts parse them alike.
 */
export function sessionToCsv(record: SessionRecord, t: Messages): string {
  const { csv } = t.records;
  const field = (name: string, value: string): string => `${COMMENT_MARK}${name}: ${value}`;
  const header = [
    `${COMMENT_MARK}${csv.title(APP_NAME, record.id)}`,
    field(csv.fields.startedAt, record.startedAt),
    field(csv.fields.endedAt, record.endedAt),
    field(csv.fields.plannedMinutes, String(record.plannedMinutes)),
    field(csv.fields.listenedSeconds, String(Math.round(record.listenedSeconds))),
    field(csv.fields.ratingBefore, optional(record.ratingBefore)),
    field(csv.fields.ratingAfter, optional(record.ratingAfter)),
    `${COMMENT_MARK}${csv.disclaimer}`,
  ];
  const columns = CSV_COLUMNS.map((column) => csv.columns[column]).join(',');
  const rows = record.samples.map((sample) => {
    const cells = sampleCells(sample, t);
    return CSV_COLUMNS.map((column) => cells[column]).join(',');
  });
  return [...header, columns, ...rows].join('\n') + '\n';
}

/** File name with the UTC start instant, safe on every operating system. */
export function csvFileName(record: SessionRecord, t: Messages): string {
  const instant = record.startedAt.slice(0, ISO_SECONDS_LENGTH).replaceAll(':', '-');
  return `${t.records.csv.fileName(DOWNLOAD_FILE_PREFIX, instant)}${CSV_EXTENSION}`;
}
