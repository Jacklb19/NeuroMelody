/** Spanish copy of the session area (ADR-25). */
export const session = {
  title: 'Sesión',
  eyebrow: 'Tu espacio de escucha',
  /** Planned duration under the heading. */
  plan: (minutes: number): string => `Plan: ${String(minutes)} minutos.`,
  technicalDetails: {
    title: 'Detalles técnicos',
    hint: 'Gráfica de la señal, índices y parámetros musicales',
  },
  checkIn: {
    ratingBeforeLegend: '¿Cómo te sientes antes de empezar?',
    /** Reminder of the rating given before starting, out of the scale's maximum. */
    ratingBefore: (rating: number, maxRating: number): string =>
      `Al empezar te sentías en ${String(rating)} de ${String(maxRating)}.`,
    saved: 'Sesión guardada en este dispositivo.',
    savedDetail: 'Puedes revisarla y descargarla cuando quieras.',
    viewSummary: 'Ver resumen de la sesión',
    saveFailed: (reason: string): string => `No se pudo guardar la sesión en este dispositivo (${reason}).`,
  },
  progress: {
    label: 'Progreso de la sesión',
    valueText: (elapsedMinutes: number, plannedMinutes: number): string =>
      `${String(elapsedMinutes)} de ${String(plannedMinutes)} minutos`,
    /**
     * "12:00 de 20:00". The elapsed part is passed through untouched so the
     * screen can emphasise it, and each language can place it where it fits.
     */
    clock: <T>(elapsed: T, planned: string): readonly (T | string)[] => [elapsed, ` de ${planned}`],
    /** Time listened past the plan, appended to the clock. */
    extra: (extra: string): string => ` · ${extra} más`,
  },
  stage: {
    eyebrow: 'Ahora',
    estimatedState: 'Estado estimado:',
    confidence: 'Confianza no calibrada · reglas provisionales',
    waitingForQuality: 'La adaptación espera datos de buena calidad.',
    /** Why the music holds its step; the minutes come from the adaptation rules (ADR-12). */
    dwell: (minutes: number): string =>
      `Se conserva el escalón hasta completar su duración mínima de ${String(minutes)} minutos.`,
  },
  /**
   * The moment of the session in plain words (ADR-24), keyed by
   * `ListeningNarrativeId`. Descriptive, never clinical (R-06): it compares
   * the body with its own starting point and says what the music does.
   */
  narrative: {
    reconnecting: {
      title: 'Recuperando la conexión',
      detail: 'La música sigue sonando y conserva su ritmo mientras vuelve la señal.',
    },
    noSource: {
      title: 'Conecta una fuente de señal',
      detail: 'La música puede sonar sin señal, pero solo se adapta a ti cuando hay una fuente conectada.',
    },
    calibrating: {
      title: 'Tomando tu referencia',
      detail: 'Durante los primeros minutos la música se mantiene estable mientras aprende tu ritmo de partida.',
    },
    musicStopped: {
      title: 'La música está detenida',
      detail: 'La señal sigue llegando. Cuando inicies la música, volverá a acompañar tu ritmo.',
    },
    unclearSignal: {
      title: 'Esperando una señal clara',
      detail: 'La música conserva su paso. Revisa que el sensor esté bien colocado.',
    },
    high: {
      title: 'Tu ritmo está más activo que al empezar',
      detail: 'La música baja el paso poco a poco para acompañarte.',
    },
    low: {
      title: 'Tu ritmo está más tranquilo que al empezar',
      detail: 'La música sigue esa calma y avanza hacia un paso más lento.',
    },
    uncertain: {
      title: 'Tu ritmo se mantiene cerca del inicio',
      detail: 'La música avanza despacio, sin cambios bruscos.',
    },
  },
};
