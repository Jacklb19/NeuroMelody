import type { BeatNotification } from '../acquisition/contract';

/** Límites de frecuencia cardíaca aceptados en la frontera de la capa. */
export const MIN_HR = 20;
export const MAX_HR = 250;

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string };

/**
 * Valida la estructura de una notificación antes de que entre al sistema.
 *
 * Solo rechaza datos imposibles o corruptos. El filtrado de latidos anómalos
 * pero posibles (ectópicos, artefactos) es responsabilidad del hilo de señal
 * (RF-04), no de esta frontera.
 *
 * @param notification Notificación recibida de la fuente.
 * @param previousTimeMs Tiempo de la última notificación aceptada.
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
