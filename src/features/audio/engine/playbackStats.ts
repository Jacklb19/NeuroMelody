/**
 * Lectura de `AudioContext.playbackStats` (Chrome 146 en adelante): el
 * contador de subdesbordamientos con el que se verifica RNF-01. En los
 * navegadores sin la API devuelve `null` y la interfaz oculta la métrica.
 */
export interface EstadisticasReproduccion {
  /** Veces que el hilo de audio no entregó su bloque a tiempo. */
  readonly subdesbordamientos: number;
  readonly duracionSubdesbordamientosS: number;
  /** Duración total reproducida según el navegador. */
  readonly duracionTotalS: number;
}

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null;
}

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

export function leerEstadisticasReproduccion(contexto: unknown): EstadisticasReproduccion | null {
  if (!esRegistro(contexto) || !esRegistro(contexto.playbackStats)) {
    return null;
  }
  const { underrunEvents, underrunDuration, totalDuration } = contexto.playbackStats;
  const subdesbordamientos = numero(underrunEvents);
  const duracionSubdesbordamientosS = numero(underrunDuration);
  const duracionTotalS = numero(totalDuration);
  if (subdesbordamientos === null || duracionSubdesbordamientosS === null || duracionTotalS === null) {
    return null;
  }
  return { subdesbordamientos, duracionSubdesbordamientosS, duracionTotalS };
}
