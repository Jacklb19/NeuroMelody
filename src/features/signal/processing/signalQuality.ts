import type { LatidoClasificado, TramoBajaCalidad } from './types';
import { ACEPTACION_MINIMA, VENTANA_CALIDAD_MS } from './thresholds';

/**
 * Proporción de latidos aceptados entre los que terminan en los últimos
 * 30 s de señal; `null` si en ese intervalo no terminó ningún latido.
 */
export function aceptacionReciente(
  latidos: readonly LatidoClasificado[],
  tiempoActualMs: number,
): number | null {
  const desdeMs = tiempoActualMs - VENTANA_CALIDAD_MS;
  let total = 0;
  let aceptados = 0;
  for (const latido of latidos) {
    if (latido.finMs > desdeMs && latido.finMs <= tiempoActualMs) {
      total++;
      if (latido.aceptado) {
        aceptados++;
      }
    }
  }
  return total === 0 ? null : aceptados / total;
}

/** `true` si la proporción reciente de latidos aceptados es menor del 80 %. */
export function aceptacionBaja(
  latidos: readonly LatidoClasificado[],
  tiempoActualMs: number,
): boolean {
  const proporcion = aceptacionReciente(latidos, tiempoActualMs);
  return proporcion !== null && proporcion < ACEPTACION_MINIMA;
}

/**
 * Añade un tramo de baja calidad a una lista ordenada, fusionándolo con el
 * último si se solapan o se tocan, para no dibujar franjas fragmentadas.
 */
export function agregarTramo(
  tramos: readonly TramoBajaCalidad[],
  nuevo: TramoBajaCalidad,
): TramoBajaCalidad[] {
  const ultimo = tramos.at(-1);
  if (ultimo !== undefined && nuevo.inicioMs <= ultimo.finMs) {
    return [
      ...tramos.slice(0, -1),
      { inicioMs: ultimo.inicioMs, finMs: Math.max(ultimo.finMs, nuevo.finMs) },
    ];
  }
  return [...tramos, nuevo];
}
