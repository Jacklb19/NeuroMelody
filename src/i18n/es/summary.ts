import { common } from './common';

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
      common.nonClinicalIndicators,
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
    footnote: 'Tiempo de señal. El estado es una estimación a partir de tu pulso, no una medida clínica.',
  },
  /** The session told in plain words by the language model (RF-15); always marked as generated automatically. */
  automatic: {
    label: 'Resumen en lenguaje sencillo',
    title: 'Tu sesión en pocas palabras',
    generatedMark: 'Texto generado automáticamente. Describe las cifras; no es una valoración.',
    /** What travels, said before asking: asking is the consent. */
    notice: 'Para escribirlo, un modelo de lenguaje recibe solo cifras de esta sesión: minutos escuchados, pulso y variación al empezar y al terminar, tiempo en cada estado y tus dos valoraciones. No recibe tu nombre, la fecha ni tus latidos.',
    ask: 'Acepto y quiero el resumen',
    askAgain: 'Pedir otro',
    working: 'Escribiendo el resumen…',
    /** Why it cannot be asked for; keys mirror the sync statuses that prevent it. */
    needs: {
      unavailable: 'El resumen automático no está disponible en esta versión de la app. Arriba tienes todos los indicadores de la sesión.',
      signed_out: 'El resumen automático necesita una cuenta, con la sesión guardada en ella.',
      needs_second_factor: 'El resumen automático necesita la verificación en dos pasos, porque usa datos de tu sesión guardados en tu cuenta.',
      needs_consent: 'El resumen automático usa la sesión guardada en tu cuenta, y para guardarla falta tu consentimiento.',
    },
    /** The session is on this device but not in the account yet. */
    notInCloud: 'Esta sesión todavía no está en tu cuenta. Espera a que se sincronice (lo ves en el historial) e inténtalo de nuevo.',
    /** `reason` is one of the cloud error sentences. */
    failed: (reason: string): string => `No se pudo escribir el resumen: ${reason} Los indicadores de arriba no cambian.`,
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
