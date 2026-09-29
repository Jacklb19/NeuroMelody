import type { NotificacionLatido } from './contrato';

/** Límites de frecuencia cardíaca aceptados en la frontera de la capa. */
export const FC_MINIMA = 20;
export const FC_MAXIMA = 250;

export type ResultadoValidacion =
  | { readonly valida: true }
  | { readonly valida: false; readonly motivo: string };

/**
 * Valida la estructura de una notificación antes de que entre al sistema.
 *
 * Solo rechaza datos imposibles o corruptos. El filtrado de latidos anómalos
 * pero posibles (ectópicos, artefactos) es responsabilidad del hilo de señal
 * (RF-04), no de esta frontera.
 *
 * @param notificacion Notificación recibida de la fuente.
 * @param tiempoPrevioMs Tiempo de la última notificación aceptada.
 */
export function validarNotificacion(
  notificacion: NotificacionLatido,
  tiempoPrevioMs: number,
): ResultadoValidacion {
  const { tiempoMs, frecuenciaCardiaca, intervalosRRms } = notificacion;

  if (!Number.isFinite(tiempoMs) || tiempoMs < 0) {
    return { valida: false, motivo: 'Tiempo de señal no válido.' };
  }
  if (tiempoMs < tiempoPrevioMs) {
    return { valida: false, motivo: 'El tiempo de señal retrocedió.' };
  }
  if (
    !Number.isFinite(frecuenciaCardiaca) ||
    frecuenciaCardiaca < FC_MINIMA ||
    frecuenciaCardiaca > FC_MAXIMA
  ) {
    return {
      valida: false,
      motivo: `Frecuencia cardíaca fuera del rango ${String(FC_MINIMA)}–${String(FC_MAXIMA)} lpm.`,
    };
  }
  if (intervalosRRms.some((rr) => !Number.isFinite(rr) || rr <= 0)) {
    return { valida: false, motivo: 'Intervalo entre latidos no válido.' };
  }
  return { valida: true };
}
