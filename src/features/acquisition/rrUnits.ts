/**
 * El perfil estándar de ritmo cardíaco de BLE expresa los intervalos RR en
 * unidades de 1/1024 s. El simulador cuantiza con la misma resolución para
 * que su salida sea indistinguible de la de una banda real (HU-02).
 */
export const RR_UNITS_PER_SECOND = 1024;

/** Convierte unidades BLE de 1/1024 s a milisegundos. */
export function msFromRrUnits(units: number): number {
  return (units * 1000) / RR_UNITS_PER_SECOND;
}

/** Redondea un intervalo en ms a la resolución de 1/1024 s. */
export function quantizeRrMs(ms: number): number {
  return msFromRrUnits(Math.round((ms * RR_UNITS_PER_SECOND) / 1000));
}
