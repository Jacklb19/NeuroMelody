/** Duraciones de sesión permitidas, en minutos (RF-18: planes de 10 a 60 minutos). */
export const DURACIONES_MIN: readonly number[] = [10, 15, 20, 30, 45, 60];

/** Plan por defecto: 20 minutos (también el plan sin red del S6). */
export const DURACION_POR_OMISION_MIN = 20;

/** Lee la duración de la URL y la valida en la frontera; si no es válida, usa la de omisión. */
export function leerDuracion(valor: string | null): number {
  const numero = Number(valor);
  return valor !== null && DURACIONES_MIN.includes(numero) ? numero : DURACION_POR_OMISION_MIN;
}
