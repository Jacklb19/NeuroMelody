import { describe, expect, it } from 'vitest';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { reportOf } from './report';

// Newest first, as the store lists them.
const RECORDS = [
  sessionRecord({
    id: '017f22e2-79b0-7000-8000-000000000003',
    startedAt: '2026-10-09T10:00:00.000Z',
    endedAt: '2026-10-09T10:10:00.000Z',
    listenedSeconds: 600,
    sourceKind: 'ble',
    goals: ['relax', 'pause'],
    ratingBefore: 5,
    ratingAfter: 8,
    samples: [sample(5, { meanHr: 80, rmssd: 20 }), sample(10, { meanHr: 70, rmssd: 26 })],
  }),
  sessionRecord({
    id: '017f22e2-79b0-7000-8000-000000000002',
    startedAt: '2026-10-07T10:00:00.000Z',
    endedAt: '2026-10-07T10:20:00.000Z',
    sourceKind: 'camera',
    goals: ['pause'],
    ratingBefore: 4,
    ratingAfter: null,
    samples: [sample(5, { meanHr: 76, rmssd: 30 }), sample(10, { meanHr: 72, rmssd: 28 })],
  }),
  sessionRecord({
    id: '017f22e2-79b0-7000-8000-000000000001',
    startedAt: '2026-10-05T10:00:00.000Z',
    endedAt: '2026-10-05T10:20:00.000Z',
    sourceKind: 'simulator',
    ratingBefore: null,
    ratingAfter: null,
  }),
];

describe('reportOf', () => {
  it('covers the period from the oldest to the most recent session and lists them oldest first', () => {
    const report = reportOf(RECORDS);
    expect(report.progress.since).toBe('2026-10-05T10:00:00.000Z');
    expect(report.until).toBe('2026-10-09T10:00:00.000Z');
    expect(report.rows.map((row) => row.sourceKind)).toEqual(['simulator', 'camera', 'ble']);
    expect(report.rows[2]?.listenedSeconds).toBe(600);
  });

  it('averages each metric only over the sessions that have both values', () => {
    const { averages } = reportOf(RECORDS);
    // Two sessions measured a pulse; the one without samples does not pull the mean down.
    expect(averages.heartRate).toEqual({ start: 78, end: 71 });
    expect(averages.variability).toEqual({ start: 25, end: 27 });
    // Only one session has an answer before and after.
    expect(averages.rating).toEqual({ start: 5, end: 8 });
  });

  it('has no average when no session can be compared', () => {
    expect(reportOf([RECORDS[2] ?? sessionRecord()]).averages.heartRate).toEqual({ start: null, end: null });
  });

  it('counts the goals chosen, the most chosen first', () => {
    expect(reportOf(RECORDS).goals).toEqual([{ id: 'pause', sessions: 2 }, { id: 'relax', sessions: 1 }]);
  });

  it('is empty without sessions', () => {
    const report = reportOf([]);
    expect(report.until).toBeNull();
    expect(report.rows).toEqual([]);
    expect(report.goals).toEqual([]);
  });
});
