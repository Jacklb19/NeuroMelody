import type { BeatNotification } from '../acquisition/contract';

/** Heart rate limits accepted at the layer boundary. */
export const MIN_HR = 20;
export const MAX_HR = 250;

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string };

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
    return { valid: false, reason: 'Tiempo de señal no válido.' };
  }
  if (timeMs < previousTimeMs) {
    return { valid: false, reason: 'El tiempo de señal retrocedió.' };
  }
  if (
    !Number.isFinite(heartRate) ||
    heartRate < MIN_HR ||
    heartRate > MAX_HR
  ) {
    return {
      valid: false,
      reason: `Frecuencia cardíaca fuera del rango ${String(MIN_HR)}–${String(MAX_HR)} lpm.`,
    };
  }
  if (rrIntervalsMs.some((rr) => !Number.isFinite(rr) || rr <= 0)) {
    return { valid: false, reason: 'Intervalo entre latidos no válido.' };
  }
  return { valid: true };
}
