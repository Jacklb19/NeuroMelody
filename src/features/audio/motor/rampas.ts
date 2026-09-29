/** Duración mínima de toda rampa de tempo (RNF-03, HU-04). */
export const RAMPA_TEMPO_MINIMA_S = 20;
/** Segundos por cada BPM de diferencia: "un pulso por minuto cada dos segundos". */
export const SEGUNDOS_POR_BPM = 2;
/** Brillo y reverberación se interpolan en 30 a 60 s; se usa el centro del rango. */
export const DURACION_RAMPA_TIMBRE_S = 45;

/** Duración de la rampa de tempo: máx(20 s, |ΔBPM| × 2 s). */
export function duracionRampaTempoS(desdeBpm: number, hastaBpm: number): number {
  return Math.max(RAMPA_TEMPO_MINIMA_S, Math.abs(hastaBpm - desdeBpm) * SEGUNDOS_POR_BPM);
}

export function dbAGanancia(db: number): number {
  return 10 ** (db / 20);
}

export function gananciaADb(ganancia: number): number {
  return 20 * Math.log10(ganancia);
}
