/** Spanish copy of the history area (ADR-25). */
export const history = {
  title: 'Historial',
  eyebrow: 'Tus sesiones',
  introduction: 'Tus sesiones guardadas. Puedes borrarlas cuando quieras.',
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
  /** Headings of the weeks the list is grouped in, Monday first. */
  weeks: {
    this: 'Esta semana',
    last: 'La semana pasada',
    of: (date: string): string => `Semana del ${date}`,
  },
  item: {
    listenedOf: (listened: string, plannedMinutes: number): string => `${listened} de ${String(plannedMinutes)} min`,
    feeling: 'Cómo te sentías',
    delete: 'Borrar',
    confirmDelete: 'Sí, borrar esta sesión',
  },
};
