/** Spanish copy of the audio area (ADR-25). */
export const audio = {
  /** Names of the music levels; keys mirror `LevelId`. */
  levels: {
    high: 'Activación alta',
    intermediate: 'Intermedio',
    target: 'Activación baja (meta)',
  },
  /** Names of the musical modes; keys mirror the names in `MODE`. */
  modes: {
    majorPentatonic: 'Pentatónica mayor',
    lydian: 'Lidio',
    dronePentatonic: 'Bordón con pentatónica',
  },
  /** Playback panel of the session screen. */
  playback: {
    title: 'Música',
    volumeNotice: 'Usa un volumen moderado en tu dispositivo.',
    start: 'Iniciar música',
    volume: 'Volumen',
    stop: 'Detener',
    statusLabel: 'Estado de la música:',
    /** Keys mirror `AudioState`. */
    states: {
      idle: 'Lista para empezar',
      loading: 'Preparando el audio…',
      playing: 'Sonando',
      stopped: 'Detenida',
      error: 'No se pudo iniciar el audio',
    },
    finished: 'La sesión terminó',
    /** `detail` explains the failure: an engine error or the browser's own text. */
    unavailable: (detail: string): string => `El audio no está disponible en este navegador (${detail}).`,
    planEndedTitle: 'La sesión planificada terminó',
    continuousListeningTitle: (minutes: number): string => `Llevas ${String(minutes)} minutos de escucha continua`,
    fadeNotice: (minutes: number): string =>
      `Si no respondes, la música se apagará en ${String(minutes)} minutos con un fundido suave.`,
    continue: 'Continuar',
    finish: 'Terminar',
    /** Shown by the operating system's media controls. */
    mediaArtist: 'Sesión de escucha',
  },
  /** Failures of the audio engine; keys mirror `AudioEngineErrorCode`. */
  errors: {
    missing_parameter: ({ parameter }: { readonly parameter: string }): string =>
      `El sintetizador no expone el parámetro ${parameter}.`,
  },
};
