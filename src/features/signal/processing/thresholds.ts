/**
 * Signal processing thresholds: provisional values approved in sprint 2 and
 * recorded in ADR-15 (docs/decisiones.md).
 */

/** Rango plausible de un intervalo RR (30–200 lpm). */
export const MIN_RR_MS = 300;
export const MAX_RR_MS = 2000;

/** Desviación relativa máxima respecto de la mediana de referencia (regla del 20 %). */
export const MAX_DEVIATION = 0.2;
/** Latidos aceptados que forman la mediana de referencia. */
export const REFERENCE_BEATS = 5;
/** Descartes por desviación seguidos tras los que se reinicia la referencia. */
export const DISCARDS_TO_RESET = 5;

/** Tiempo sin intervalos RR a partir del cual hay un hueco en la señal. */
export const MAX_GAP_MS = 3000;
/** Ventana y proporción mínima de latidos aceptados para considerar buena la señal. */
export const QUALITY_WINDOW_MS = 30_000;
export const MIN_ACCEPTANCE = 0.8;

/** Ventana deslizante del análisis y periodo de recálculo (documento, sección del lazo). */
export const ANALYSIS_WINDOW_MS = 5 * 60 * 1000;
export const COMPUTE_PERIOD_MS = 5000;
/** Señal NN válida mínima en la ventana para publicar índices. */
export const MIN_NN_FOR_INDICES_MS = 60_000;
