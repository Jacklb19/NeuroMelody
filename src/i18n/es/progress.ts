import { common } from './common';

/** "3 de 8 sesiones", "1 de 1 sesión": the sessions something happened in, out of those that could be compared. */
const sessionsOf = (count: number, compared: number): string =>
  `${String(count)} de ${String(compared)} ${compared === 1 ? 'sesión' : 'sesiones'}`;

/**
 * Spanish copy of the progress view (ADR-33). It describes what the figures
 * did across sessions and never says what they mean for the person's health.
 */
export const progress = {
  title: 'Tu progreso',
  eyebrow: 'Entre sesiones',
  introduction: 'Cómo han ido tus sesiones guardadas en este dispositivo, de la más antigua a la más reciente.',
  loading: 'Cargando tus sesiones…',
  empty: 'Aún no hay sesiones guardadas. Cuando termines la primera, aquí verás cómo te va.',
  planSession: 'Preparar una sesión',
  /** Shown with a single session: there is nothing to compare it with yet. */
  single: 'Con una sola sesión todavía no hay evolución que mostrar. Aparecerá a partir de la segunda.',
  range: {
    label: 'Sesiones que se muestran',
    /** The most recent sessions; the figure comes from the range catalog. */
    last: (count: number): string => `Últimas ${String(count)}`,
    all: 'Todas',
  },
  totals: {
    sessions: 'Sesiones',
    minutes: 'Minutos escuchados',
    since: 'Desde',
  },
  /** The two lines of every chart. */
  legend: {
    start: 'Al empezar',
    end: 'Al terminar',
  },
  /**
   * Keys mirror `ProgressMetricId`. Each insight receives the sessions where
   * the metric moved in its `INSIGHT_DIRECTION` and those that could be compared.
   */
  metrics: {
    heartRate: {
      title: 'Tu pulso',
      explanation: 'Latidos por minuto, en promedio, al empezar y al terminar cada sesión.',
      chartLabel: 'Pulso al empezar y al terminar cada sesión, de la más antigua a la más reciente',
      column: 'Pulso',
      insight: (count: number, compared: number): string =>
        `En ${sessionsOf(count, compared)} tu pulso terminó más bajo que al empezar.`,
    },
    variability: {
      title: 'Variación entre latidos',
      explanation: 'Cuánto cambia el tiempo entre un latido y el siguiente. Cada persona tiene la suya.',
      chartLabel: 'Variación entre latidos al empezar y al terminar cada sesión, de la más antigua a la más reciente',
      column: 'Variación entre latidos',
      insight: (count: number, compared: number): string =>
        `En ${sessionsOf(count, compared)} la variación terminó más alta que al empezar.`,
    },
    rating: {
      title: 'Cómo te sentías',
      explanation: 'El número que elegiste antes y después de escuchar.',
      chartLabel: 'Cómo te sentías antes y después de cada sesión, de la más antigua a la más reciente',
      column: 'Cómo te sentías',
      insight: (count: number, compared: number): string =>
        `En ${sessionsOf(count, compared)} elegiste un número más alto al terminar que al empezar.`,
    },
  },
  /** Instead of the insight when no session has both values of a metric. */
  noComparison: 'Todavía no hay sesiones con los dos valores para comparar.',
  /** Instead of the chart when no session has any value of a metric. */
  noData: 'Todavía no hay datos para esta gráfica.',
  chart: {
    /** Read by screen readers after the chart's name. */
    keyboardHint: 'Con las flechas izquierda y derecha recorres las sesiones.',
  },
  table: {
    summary: 'Ver los datos en una tabla',
    caption: 'Valores al empezar y al terminar cada sesión',
    session: 'Sesión',
  },
  notice: common.nonClinicalIndicators,
};
