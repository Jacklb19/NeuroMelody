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
  evolution: {
    title: 'Evolución entre sesiones',
    rmssdLabel: 'Variabilidad entre latidos al final de cada sesión, de la más antigua a la más reciente',
    rmssdCaption: 'Variabilidad entre latidos al final de cada sesión',
    ratingLabel: 'Cómo te sentías al terminar cada sesión, de la más antigua a la más reciente',
    ratingCaption: 'Cómo te sentías al terminar',
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
