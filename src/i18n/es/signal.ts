/** Spanish copy of the signal area (ADR-25). Always descriptive, never clinical. */
export const signal = {
  title: 'Señal e indicadores',
  qualityLabel: 'Calidad de la señal:',
  waitingForData: 'Esperando datos de la señal',
  /** Signal quality as the person reads it; keys mirror `SignalQuality`. */
  quality: {
    collecting: 'Reuniendo datos…',
    good: 'Buena',
    low: 'Baja: revisa la colocación del dispositivo.',
  },
  threadUnavailable: 'El análisis de la señal no está disponible en este navegador.',
  /** `reason` is one of `errors` or the browser's own words when the Worker crashed. */
  threadFailed: (reason: string): string => `No se pudo actualizar el análisis de la señal (${reason}).`,
  /** Keys mirror `SignalThreadErrorCode`. */
  errors: {
    unrecognized_message: 'Mensaje no reconocido por el hilo de señal.',
    no_2d_context: 'No se pudo obtener el contexto 2D del lienzo.',
    unreadable_message: 'No se pudo leer un mensaje del hilo de señal.',
    unrecognized_response: 'Respuesta no reconocida del hilo de señal.',
  },
  chart: {
    /** Accessible name of the tachogram; `minutes` is the analysis window. */
    accessibleName: (minutes: number): string =>
      `Tacograma: intervalos entre latidos de los últimos ${String(minutes)} minutos`,
    unavailable: (reason: string): string =>
      `La gráfica no está disponible: ${reason}. Los indicadores en texto siguen actualizándose.`,
    noOffscreenCanvas: 'Este navegador no puede dibujar la gráfica en segundo plano.',
    stylesMissing: (detail: string): string => `Faltan estilos de la gráfica (${detail})`,
    /** Keys mirror `ChartPaletteErrorCode`; the parameter is the CSS variable or value at fault. */
    paletteErrors: {
      missing_variable: (variable: string): string => `Falta la variable CSS ${variable}.`,
      invalid_font_size: (value: string): string => `Tamaño de fuente no válido: ${value}.`,
    },
  },
  /** Labels of the indicators, reusable wherever the same figures are shown. */
  metrics: {
    meanHr: 'Frecuencia cardíaca media',
    rmssd: 'Variabilidad entre latidos (RMSSD)',
    sdnn: 'Variabilidad global (SDNN)',
    lfPower: 'Oscilación lenta (potencia LF)',
    hfPower: 'Oscilación rápida (potencia HF)',
    lfHfRatio: 'Razón LF/HF',
    analysisWindow: 'Ventana analizada',
    acceptedBeats: 'Latidos aceptados',
    discardedBeats: 'Descartados por calidad de señal',
  },
  /** Covered part of the analysis window, e.g. "0:30 de 5:00". */
  windowCoverage: (covered: string, total: string): string => `${covered} de ${total}`,
  /** Why LF/HF is still missing; `duration` is the continuous signal the spectrum needs, with its unit. */
  spectrumCollecting: (duration: string): string => `Reuniendo ${duration} continuos`,
};
