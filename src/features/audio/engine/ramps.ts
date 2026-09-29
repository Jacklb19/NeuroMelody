/** Duración mínima de toda rampa de tempo (RNF-03, HU-04). */
export const MIN_TEMPO_RAMP_S = 20;
/** Segundos por cada BPM de diferencia: "un pulso por minuto cada dos segundos". */
export const SECONDS_PER_BPM = 2;
/** Brillo y reverberación se interpolan en 30 a 60 s; se usa el centro del rango. */
export const TIMBRE_RAMP_DURATION_S = 45;

/** Duración de la rampa de tempo: máx(20 s, |ΔBPM| × 2 s). */
export function tempoRampDurationS(fromBpm: number, toBpm: number): number {
  return Math.max(MIN_TEMPO_RAMP_S, Math.abs(toBpm - fromBpm) * SECONDS_PER_BPM);
}

export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

export function gainToDb(gain: number): number {
  return 20 * Math.log10(gain);
}
