/** "3 de 8 sesiones", "1 de 1 sesión": the sessions something happened in, out of those that could be compared. */
const sessionsOf = (count: number, compared: number): string =>
  `${String(count)} de ${String(compared)} ${compared === 1 ? 'sesión' : 'sesiones'}`;

const sessions = (count: number): string => `${String(count)} ${count === 1 ? 'sesión' : 'sesiones'}`;

/**
 * Spanish copy of the printable report (ADR-33). The screen around the sheet
 * talks to the person; the sheet itself is read by somebody else, so it
 * names things without "tu". It describes figures and concludes nothing.
 */
export const report = {
  pageTitle: 'Informe de tus sesiones',
  eyebrow: 'Para compartir',
  introduction: 'Una hoja con el resumen de tus sesiones, para imprimir o guardar como PDF y llevarla a quien te acompaña: tu terapeuta, tu médico o alguien de confianza. Se arma con las sesiones guardadas en este dispositivo y no se envía a ningún lado.',
  empty: 'Aún no hay sesiones guardadas. Cuando termines la primera, aquí podrás preparar tu informe.',
  /** Every saved session was made to try the app, so there is nothing of the person to report. */
  onlyTrials: 'Las sesiones guardadas se hicieron con el simulador o con un registro de ejemplo, que sirven para probar la app. El informe se arma con las sesiones en las que se midió tu pulso.',
  /** Sessions left out of the sheet, said on screen only. */
  excluded: (count: number): string =>
    count === 1
      ? 'Una sesión de prueba (simulador o registro de ejemplo) no entra en el informe.'
      : `${String(count)} sesiones de prueba (simulador o registro de ejemplo) no entran en el informe.`,
  print: 'Imprimir o guardar como PDF',
  printHint: 'Se abre la ventana de impresión de tu navegador. Para un PDF, elige «Guardar como PDF» como impresora.',
  /** Title of the printed sheet. */
  sheetTitle: 'Resumen de sesiones de escucha',
  preparedOn: (date: string): string => `Preparado el ${date}`,
  /** Dates of the oldest and the most recent session of the sheet. */
  period: (since: string, until: string): string => (since === until ? since : `Del ${since} al ${until}`),
  goals: {
    label: 'Lo que buscaba',
    none: 'Sin objetivos elegidos',
    /** A goal and the sessions it was chosen in, e.g. "Relajarme · 4 sesiones". */
    count: (name: string, count: number): string => `${name} · ${sessions(count)}`,
  },
  averages: {
    start: 'Promedio al empezar',
    end: 'Promedio al terminar',
  },
  /**
   * Keys mirror `ProgressMetricId`. Every explanation receives the ends of the
   * self-rating scale, which only the rating uses. Each insight receives the
   * sessions where the metric moved in its `INSIGHT_DIRECTION` and those compared.
   */
  metrics: {
    heartRate: {
      title: 'Pulso',
      explanation: (): string => 'Latidos por minuto, en promedio, al empezar y al terminar cada sesión.',
      insight: (count: number, compared: number): string =>
        `En ${sessionsOf(count, compared)} el pulso terminó más bajo que al empezar.`,
    },
    variability: {
      title: 'Variación entre latidos',
      explanation: (): string => 'Cuánto cambia el tiempo entre un latido y el siguiente (RMSSD). Cada persona tiene la suya.',
      insight: (count: number, compared: number): string =>
        `En ${sessionsOf(count, compared)} la variación terminó más alta que al empezar.`,
    },
    rating: {
      title: 'Cómo se sentía',
      explanation: (min: number, max: number): string =>
        `El número que la persona eligió antes y después de escuchar, de ${String(min)} (nada bien) a ${String(max)} (muy bien).`,
      insight: (count: number, compared: number): string =>
        `En ${sessionsOf(count, compared)} eligió un número más alto al terminar que al empezar.`,
    },
  },
  table: {
    title: 'Sesión por sesión',
    date: 'Fecha',
    listened: 'Escuchó',
    source: 'Medido con',
  },
  notes: {
    title: 'Para leer esta hoja',
    whatItIs: (appName: string): string =>
      `${appName} es una app de bienestar que adapta música al pulso de quien la escucha. No es un dispositivo médico.`,
    /** How the two values of every session are taken; the seconds come from `EDGE_SECONDS`. */
    edges: (seconds: number): string =>
      `«Al empezar» y «al terminar» son el promedio de los primeros y los últimos ${String(seconds)} segundos con buena señal de cada sesión.`,
  },
};
