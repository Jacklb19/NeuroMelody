/** Spanish copy of the records area: stored sessions, self-ratings and the CSV export (ADR-25). */
export const records = {
  /** Label of the self-ratings, shared by the summary and the history. */
  ratingLabel: 'Cómo te sentías',
  rating: {
    /** Meaning of both ends of the self-rating scale (ADR-23). */
    scaleHint: (min: number, max: number): string => `${String(min)} = nada bien · ${String(max)} = muy bien`,
    clear: 'Quitar respuesta',
  },
  /** Both self-ratings were skipped. */
  noAnswer: 'Sin responder',
  /** A value at the start and at the end of the session, e.g. "78 → 68". */
  change: (start: string, end: string): string => `${start} → ${end}`,
  /** A duration shorter than the given amount, e.g. "menos de 1 min". */
  lessThan: (amount: string): string => `menos de ${amount}`,
  readFailed: (reason: string): string => `No se pudo leer el historial (${reason}).`,
  /** Keyed by `SessionStoreErrorCode`. */
  errors: {
    invalid_record: 'La sesión no tiene un formato válido.',
    invalid_rating: (min: number, max: number): string =>
      `La valoración debe ser un número entero de ${String(min)} a ${String(max)}.`,
    not_found: 'No se encontró la sesión.',
    access_failed: 'No se pudo acceder al historial del dispositivo.',
    open_failed: 'No se pudo abrir el historial del dispositivo.',
  },
  /**
   * Downloadable CSV (RF-15). It is meant for the person and their
   * therapist, so its column names and comments follow the interface language.
   */
  csv: {
    /** First comment line. */
    title: (appName: string, id: string): string => `${appName} · sesión ${id}`,
    /** Names of the session details written as comment lines. */
    fields: {
      startedAt: 'inicio',
      endedAt: 'fin',
      plannedMinutes: 'plan_minutos',
      listenedSeconds: 'escucha_segundos',
      ratingBefore: 'valoracion_antes',
      ratingAfter: 'valoracion_despues',
    },
    disclaimer: 'Indicadores descriptivos; no son una medida clínica.',
    /** Keyed by `CsvColumn`. */
    columns: {
      second: 'segundo',
      meanHr: 'fc_media_lpm',
      rmssd: 'rmssd_ms',
      sdnn: 'sdnn_ms',
      lfHfRatio: 'lf_hf',
      estimatedState: 'estado_estimado',
      goodQuality: 'calidad_buena',
    },
    /** File name without extension, e.g. "neuromelody-sesion-2026-10-07T10-00-00". */
    fileName: (prefix: string, startedAt: string): string => `${prefix}-sesion-${startedAt}`,
  },
};
