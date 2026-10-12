/** Spanish copy of the history area (ADR-25). */
export const history = {
  title: 'Historial',
  eyebrow: 'Tus sesiones',
  introduction: 'Las sesiones se guardan solo en este dispositivo. Puedes borrarlas cuando quieras.',
  loading: 'Cargando el historial…',
  empty: 'Aún no hay sesiones guardadas. Cuando termines una sesión de escucha aparecerá aquí, con su resumen.',
  planSession: 'Preparar una sesión',
  clearAll: 'Borrar todo el historial',
  confirmClearAll: 'Sí, borrar todas las sesiones',
  /** Way into the progress view, which shows the evolution across sessions (ADR-33). */
  progress: {
    title: 'Mira cómo te ha ido',
    text: 'Tu pulso y cómo te sentías, sesión a sesión.',
    action: 'Ver tu progreso',
  },
  item: {
    listenedOf: (listened: string, plannedMinutes: number): string => `${listened} de ${String(plannedMinutes)} min`,
    heartRate: 'Frecuencia media',
    rmssd: 'RMSSD',
    viewSummary: 'Ver resumen',
    delete: 'Borrar',
    confirmDelete: 'Sí, borrar esta sesión',
  },
};
