import type { SessionRecord, SessionSample } from '../features/records/sessionRecord';

/** A good-quality sample with neutral values; tests override what they check. */
export function sample(second: number, overrides: Partial<SessionSample> = {}): SessionSample {
  return {
    second, meanHr: 70, rmssd: 30, sdnn: 35, lfHfRatio: 1, estimatedState: 'uncertain', goodQuality: true,
    ...overrides,
  };
}

/** A finished 20-minute session with the given samples. */
export function sessionRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: '017f22e2-79b0-7cc3-98c4-dc0c0c07398f',
    startedAt: '2026-10-07T10:00:00.000Z',
    endedAt: '2026-10-07T10:20:00.000Z',
    plannedMinutes: 20,
    listenedSeconds: 1200,
    sourceKind: 'simulator',
    ratingBefore: 4,
    ratingAfter: 7,
    samples: [],
    ...overrides,
  };
}
