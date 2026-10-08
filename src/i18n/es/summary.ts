/** "1 punto", "3 puntos": Spanish plural of the self-rating points. */
const points = (count: number): string => `${String(count)} ${count === 1 ? 'punto' : 'puntos'}`;

/** Spanish copy of the summary area (ADR-25). */
export const summary = {
  title: 'Resumen de la sesión',
  loading: 'Cargando…',
  missing: {
    title: 'Sesión no encontrada',
    detail: 'Esta sesión no está guardada en este dispositivo. Puede que se haya borrado.',
  },
  goToHistory: 'Ir al historial',
  listenedOf: (listened: string, plannedMinutes: number): string =>
    `Escuchaste ${listened} de un plan de ${String(plannedMinutes)} minutos.`,
  figures: {
    title: 'Al inicio y al final',
    heartRate: 'Frecuencia cardíaca media',
    rmssd: 'Variabilidad entre latidos (RMSSD)',
    rmssdTrend: 'Variabilidad entre latidos a lo largo de la sesión',
    lfHfAtEnd: 'Razón LF/HF al final',
    /** The seconds come from the samples averaged at each end of the session. */
    footnote: (edgeSeconds: number): string =>
      `Cada valor promedia hasta ${String(edgeSeconds)} s de señal de buena calidad al principio y al final. ` +
      'Son indicadores descriptivos de tu señal: no miden el dolor ni son una valoración clínica.',
  },
  /** Self-rating after listening compared with the one before. */
  ratingChange: {
    same: 'Igual que al empezar',
    more: (count: number): string => `${points(count)} más que al empezar`,
    less: (count: number): string => `${points(count)} menos que al empezar`,
  },
  stateShare: {
    title: 'Cómo se fue moviendo tu ritmo',
    empty: 'No hubo señal suficiente para estimar el estado durante esta sesión.',
    /** Descriptive name of each phase, keyed by `SignalPhase`. */
    phases: {
      calibrating: 'Tomando la referencia',
      high: 'Más activo que al empezar',
      uncertain: 'Cerca del inicio',
      low: 'Más tranquilo que al empezar',
    },
    footnote: 'Tiempo de señal. Estimación con reglas provisionales y confianza no calibrada.',
  },
  pending: {
    label: 'Resumen en lenguaje sencillo',
    title: 'Resumen automático pendiente.',
    detail: 'El texto en lenguaje sencillo, generado automáticamente, estará disponible cuando conectes tu cuenta.',
  },
  download: 'Descargar datos (CSV)',
  viewHistory: 'Ver historial',
  planAnother: 'Preparar otra sesión',
  afterRating: {
    label: 'Valoración al terminar',
    legend: '¿Cómo te sientes ahora, al terminar?',
    save: 'Guardar valoración',
    saveFailed: (reason: string): string => `No se pudo guardar la valoración (${reason}).`,
  },
};
