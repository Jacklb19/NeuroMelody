import type { BeatNotification } from '../acquisition/contract';
import { MAX_HR, MIN_HR } from './config';

/** Why the boundary rejected a notification; the interface turns each code into text. */
export const NOTIFICATION_ISSUES = ['invalid_time', 'time_regressed', 'heart_rate_out_of_range', 'invalid_rr'] as const;

export type NotificationIssue = (typeof NOTIFICATION_ISSUES)[number];

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly code: NotificationIssue };

/**
 * Validates the structure of a notification before it enters the system.
 *
 * It only rejects impossible or corrupt data. Filtering abnormal but
 * possible beats (ectopic beats, artifacts) is the signal thread's job
 * (RF-04), not this boundary's.
 *
 * @param notification Notification received from the source.
 * @param previousTimeMs Time of the last accepted notification.
 */
export function validateNotification(
  notification: BeatNotification,
  previousTimeMs: number,
): ValidationResult {
  const { timeMs, heartRate, rrIntervalsMs } = notification;

  if (!Number.isFinite(timeMs) || timeMs < 0) {
    return { valid: false, code: 'invalid_time' };
  }
  if (timeMs < previousTimeMs) {
    return { valid: false, code: 'time_regressed' };
  }
  if (
    !Number.isFinite(heartRate) ||
    heartRate < MIN_HR ||
    heartRate > MAX_HR
  ) {
    return { valid: false, code: 'heart_rate_out_of_range' };
  }
  if (rrIntervalsMs.some((rr) => !Number.isFinite(rr) || rr <= 0)) {
    return { valid: false, code: 'invalid_rr' };
  }
  return { valid: true };
}
