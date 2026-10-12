import { describe, expect, it } from 'vitest';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { progressOf, selectRange } from './progress';
import { PROGRESS_RANGE_SIZES } from './progressRangeCatalog';

const OLDER = sessionRecord({
  id: '017f22e2-79b0-7000-8000-000000000001',
  startedAt: '2026-10-05T10:00:00.000Z',
  endedAt: '2026-10-05T10:10:00.000Z',
  listenedSeconds: 590,
  ratingBefore: 4,
  ratingAfter: 7,
  samples: [sample(5, { meanHr: 78.4, rmssd: 22 }), sample(10, { meanHr: 70.2, rmssd: 31 })],
});
const NEWER = sessionRecord({
  id: '017f22e2-79b0-7000-8000-000000000002',
  startedAt: '2026-10-06T10:00:00.000Z',
  endedAt: '2026-10-06T10:10:00.000Z',
  listenedSeconds: 130,
  ratingBefore: 6,
  ratingAfter: null,
  samples: [sample(5, { meanHr: 70.4, rmssd: 30 }), sample(10, { meanHr: 69.6, rmssd: 28 })],
});
const WITHOUT_SIGNAL = sessionRecord({
  id: '017f22e2-79b0-7000-8000-000000000003',
  startedAt: '2026-10-07T10:00:00.000Z',
  endedAt: '2026-10-07T10:10:00.000Z',
  listenedSeconds: 60,
  ratingBefore: 5,
  ratingAfter: 5,
});

describe('progressOf', () => {
  it('orders the sessions from oldest to newest with whole figures at both ends', () => {
    const progress = progressOf([WITHOUT_SIGNAL, NEWER, OLDER]);
    expect(progress.points.map((point) => point.id)).toEqual([OLDER.id, NEWER.id, WITHOUT_SIGNAL.id]);
    expect(progress.points[0]?.values).toEqual({
      heartRate: { start: 78, end: 70 },
      variability: { start: 22, end: 31 },
      rating: { start: 4, end: 7 },
    });
    expect(progress.points[2]?.values.heartRate).toEqual({ start: null, end: null });
    expect(progress).toMatchObject({ sessions: 3, minutes: 13, since: OLDER.startedAt });
  });

  it('counts only the sessions that have both values, and no change the person cannot see', () => {
    const { tallies } = progressOf([WITHOUT_SIGNAL, NEWER, OLDER]);
    // NEWER goes from 70.4 to 69.6: both read 70, so it is neither lower nor higher.
    expect(tallies.heartRate).toEqual({ compared: 2, lower: 1, higher: 0 });
    expect(tallies.variability).toEqual({ compared: 2, lower: 1, higher: 1 });
    // NEWER has no rating after; WITHOUT_SIGNAL stayed the same.
    expect(tallies.rating).toEqual({ compared: 2, lower: 0, higher: 1 });
  });

  it('has nothing to show without sessions', () => {
    expect(progressOf([])).toMatchObject({ sessions: 0, minutes: 0, since: null, points: [] });
  });
});

describe('selectRange', () => {
  it('keeps the most recent sessions of the range, or all of them', () => {
    const records = Array.from({ length: 9 }, () => OLDER);
    expect(selectRange(records, 'last7')).toHaveLength(PROGRESS_RANGE_SIZES.last7 ?? 0);
    expect(selectRange(records, 'all')).toHaveLength(9);
  });
});
