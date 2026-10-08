import { describe, it, expect } from 'vitest';
import type { BeatNotification } from '../acquisition/contract';
import { MAX_HR, MIN_HR } from './config';
import { validateNotification } from './validateNotification';

const base: BeatNotification = {
  timeMs: 1000,
  heartRate: 70,
  rrIntervalsMs: [857],
  sensorContact: true,
};

describe('validateNotification', () => {
  it('accepts a well-formed notification', () => {
    expect(validateNotification(base, 0)).toEqual({ valid: true });
  });

  it('accepts a notification without RR intervals', () => {
    expect(validateNotification({ ...base, rrIntervalsMs: [] }, 0).valid).toBe(
      true,
    );
  });

  it('accepts the exact heart rate limits', () => {
    expect(validateNotification({ ...base, heartRate: MIN_HR }, 0).valid).toBe(true);
    expect(validateNotification({ ...base, heartRate: MAX_HR }, 0).valid).toBe(true);
  });

  it.each([MIN_HR - 1, MAX_HR + 1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the heart rate %s',
    (heartRate) => {
      expect(validateNotification({ ...base, heartRate }, 0)).toEqual({
        valid: false,
        code: 'heart_rate_out_of_range',
      });
    },
  );

  it.each([0, -5, Number.NaN])('rejects the RR interval %s', (rr) => {
    expect(validateNotification({ ...base, rrIntervalsMs: [800, rr] }, 0)).toEqual({
      valid: false,
      code: 'invalid_rr',
    });
  });

  it('rejects negative or non-finite times', () => {
    expect(validateNotification({ ...base, timeMs: -1 }, 0)).toEqual({ valid: false, code: 'invalid_time' });
    expect(validateNotification({ ...base, timeMs: Number.NaN }, 0)).toEqual({ valid: false, code: 'invalid_time' });
  });

  it('rejects time going backwards and accepts it repeating', () => {
    expect(validateNotification(base, 2000)).toEqual({
      valid: false,
      code: 'time_regressed',
    });
    expect(validateNotification(base, 1000).valid).toBe(true);
  });
});
