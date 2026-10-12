import { describe, expect, it } from 'vitest';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { measuredSessions, MIN_KEPT_SECONDS, worthKeeping } from './retentionPolicy';

describe('worthKeeping', () => {
  it('keeps any session with indices, however short', () => {
    expect(worthKeeping(sessionRecord({ listenedSeconds: 1, samples: [sample(5)] }))).toBe(true);
  });

  it('keeps a session without indices only from the minimum listening time on', () => {
    expect(worthKeeping(sessionRecord({ listenedSeconds: MIN_KEPT_SECONDS - 1, samples: [] }))).toBe(false);
    expect(worthKeeping(sessionRecord({ listenedSeconds: MIN_KEPT_SECONDS, samples: [] }))).toBe(true);
  });

  it('never keeps a session made to try the app, however long or complete', () => {
    const complete = { listenedSeconds: 1200, samples: [sample(5), sample(10)] };
    expect(worthKeeping(sessionRecord({ ...complete, sourceKind: 'simulator' }))).toBe(false);
    expect(worthKeeping(sessionRecord({ ...complete, sourceKind: 'recording' }))).toBe(false);
    expect(worthKeeping(sessionRecord({ ...complete, sourceKind: 'camera' }))).toBe(true);
    // Music without any source measured nothing, but it was the person listening.
    expect(worthKeeping(sessionRecord({ ...complete, sourceKind: null }))).toBe(true);
  });
});

describe('measuredSessions', () => {
  it('leaves out the trial sessions a device kept before they stopped being stored', () => {
    const kinds = (['ble', 'simulator', null, 'recording', 'camera'] as const).map((sourceKind) => sessionRecord({ sourceKind }));
    expect(measuredSessions(kinds).map((record) => record.sourceKind)).toEqual(['ble', null, 'camera']);
  });
});
