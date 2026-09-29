/**
 * Umbrales del procesamiento de señal. Son valores provisionales aprobados en
 * el sprint 2 y documentados en docs/propuestas.md.
 */

/** Rango plausible de un intervalo RR (30–200 lpm). */
export const RR_MINIMO_MS = 300;
export const RR_MAXIMO_MS = 2000;

/** Desviación relativa máxima respecto de la mediana de referencia (regla del 20 %). */
export const DESVIACION_MAXIMA = 0.2;
/** Latidos aceptados que forman la mediana de referencia. */
export const LATIDOS_REFERENCIA = 5;
/** Descartes por desviación seguidos tras los que se reinicia la referencia. */
export const DESCARTES_PARA_REINICIAR = 5;

/** Tiempo sin intervalos RR a partir del cual hay un hueco en la señal. */
export const HUECO_MAXIMO_MS = 3000;
/** Ventana y proporción mínima de latidos aceptados para considerar buena la señal. */
export const VENTANA_CALIDAD_MS = 30_000;
export const ACEPTACION_MINIMA = 0.8;

/** Ventana deslizante del análisis y periodo de recálculo (documento, sección del lazo). */
export const VENTANA_ANALISIS_MS = 5 * 60 * 1000;
export const PERIODO_CALCULO_MS = 5000;
/** Señal NN válida mínima en la ventana para publicar índices. */
export const NN_MINIMO_PARA_INDICES_MS = 60_000;
