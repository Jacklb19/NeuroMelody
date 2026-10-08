import { describe, expect, it } from 'vitest';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { MIN_KEPT_SECONDS, worthKeeping } from './retentionPolicy';

describe('worthKeeping', () => {
  it('keeps any session with indices, however short', () => {
    expect(worthKeeping(sessionRecord({ listenedSeconds: 1, samples: [sample(5)] }))).toBe(true);
  });

  it('keeps a session without indices only from the minimum listening time on', () => {
    expect(worthKeeping(sessionRecord({ listenedSeconds: MIN_KEPT_SECONDS - 1, samples: [] }))).toBe(false);
    expect(worthKeeping(sessionRecord({ listenedSeconds: MIN_KEPT_SECONDS, samples: [] }))).toBe(true);
  });
});
