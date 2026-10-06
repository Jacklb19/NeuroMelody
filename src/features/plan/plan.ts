/** Duraciones de sesión permitidas, en minutos (RF-18: planes de 10 a 60 minutos). */
export const DURATIONS_MIN: readonly number[] = [10, 15, 20, 30, 45, 60];

/** Plan por defecto: 20 minutos (también el plan sin red del S6). */
export const DEFAULT_DURATION_MIN = 20;

/** Lee la duración de la URL y la valida en la frontera; si no es válida, usa la de omisión. */
export function readDuration(value: string | null): number {
  const parsed = Number(value);
  return value !== null && DURATIONS_MIN.includes(parsed) ? parsed : DEFAULT_DURATION_MIN;
}
