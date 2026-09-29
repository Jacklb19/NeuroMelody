/**
 * El perfil estándar de ritmo cardíaco de BLE expresa los intervalos RR en
 * unidades de 1/1024 s. El simulador cuantiza con la misma resolución para
 * que su salida sea indistinguible de la de una banda real (HU-02).
 */
export const UNIDADES_RR_POR_SEGUNDO = 1024;

/** Convierte unidades BLE de 1/1024 s a milisegundos. */
export function msDesdeUnidadesRR(unidades: number): number {
  return (unidades * 1000) / UNIDADES_RR_POR_SEGUNDO;
}

/** Redondea un intervalo en ms a la resolución de 1/1024 s. */
export function cuantizarRRms(ms: number): number {
  return msDesdeUnidadesRR(Math.round((ms * UNIDADES_RR_POR_SEGUNDO) / 1000));
}
