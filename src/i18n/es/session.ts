import { common } from './common';

/** Spanish copy of the session area (ADR-25). */
export const session = {
  title: 'Sesión',
  eyebrow: 'Tu espacio de escucha',
  /** Planned duration under the heading. */
  plan: (minutes: number): string => `Plan: ${String(minutes)} minutos.`,
  /** Dark layer of a session for falling asleep (ADR-41): the text of the button that removes it. */
  dimmer: {
    restore: 'Pantalla atenuada para dormir. Toca para verla.',
  },
  /** The session as three slides (ADR-47); `names` and `leads` keys mirror `SlideId`. */
  slides: {
    label: 'Pasos de la sesión',
    names: { pulse: 'Tu pulso', arrival: 'Cómo llegas', listening: 'Escuchando' },
    leads: {
      pulse: 'Elige cómo medir tu pulso y conéctalo. Cuando llegue, pasamos al siguiente paso.',
      arrival: 'Así estás ahora. Si quieres, di cómo te sientes antes de empezar.',
    },
    next: 'Continuar',
    withoutPulse: 'Seguir sin medir mi pulso',
    /** Mark of a finished step, and the same for a screen reader. */
    doneMark: '✓',
    done: 'hecho',
  },
  /** Second slide: the pulse now and what was chosen. */
  arrival: {
    pulseLabel: 'Tu pulso ahora',
    noPulse: 'Sin el pulso conectado la música suena, pero no se adapta a ti.',
    measure: 'Conectar mi pulso',
    choicesLabel: 'Lo que elegiste para esta sesión',
  },
  /** The steps the music of a session can take, in plain words; `levels` keys mirror `LevelId`. */
  journey: {
    label: 'Recorrido de la música',
    levels: { high: 'Con movimiento', intermediate: 'A paso medio', target: 'En calma', sleep: 'Para dormir' },
  },
  /** What the music did, shown when the session ends (ADR-42). */
  recap: {
    title: 'Lo que hizo la música',
    tempo: (from: string, to: string): string => `Empezó a ${from} pulsos por minuto y terminó a ${to}.`,
    steadyTempo: (tempo: string): string => `Se mantuvo a ${tempo} pulsos por minuto.`,
    noSteps: 'No cambió de paso durante la sesión.',
    calmerStep: (minute: number, level: string): string => `Minuto ${String(minute)}: bajó a «${level}».`,
    livelierStep: (minute: number, level: string): string => `Minuto ${String(minute)}: volvió a «${level}» para acompañarte.`,
  },
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
    /** After a session made with a trial source. */
    trialEnded: 'Era una sesión de prueba y no se guardó.',
    trialEndedDetail: 'Para guardar tus sesiones y ver tu progreso, mide tu pulso con una banda o con la cámara.',
    saveFailed: (reason: string): string => `No se pudo guardar la sesión en este dispositivo (${reason}).`,
  },
  /** Guided breathing under the orb (ADR-33): a pace to follow, never a promise of an effect. */
  breathing: {
    toggle: 'Respirar con la música',
    /** Keys mirror `BreathPhase`. */
    phases: {
      inhale: 'Inhala',
      exhale: 'Exhala',
    },
    hint: 'Sin forzar. Si te incomoda, vuelve a tu ritmo.',
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
    /** The pace of the music now; `personal` when the person's pulse moved it (ADR-39). */
    pace: (tempo: number, personal: boolean): string =>
      `La música va a ${String(tempo)} pulsos por minuto${personal ? ', ajustada a tu pulso' : ''}.`,
    help: {
      summary: '¿Qué significa?',
      text: 'La app compara tu pulso de ahora con el de tus primeros minutos. «Alta» es que el pulso subió y la variación entre latidos bajó: la música vuelve un paso para acompañarte. «Baja» es lo contrario, e «Incierta», que no cambió lo bastante: en ambos casos la música sigue bajando poco a poco. Es una estimación para guiar la música; no mide el dolor ni es un diagnóstico.',
    },
    /** Shown while the rules estimate the state, because the trained model could not be loaded. */
    confidence: common.provisionalEstimate,
    /** Shown with the trained model before it has an estimate to be confident about. */
    modelReady: 'Estimado por un modelo entrenado con datos de investigación',
    /** The model's calibrated probability for the state shown, as a whole percentage. */
    modelConfidence: (percent: number): string => `Estimado por un modelo entrenado · confianza del ${String(percent)} %`,
    waitingForQuality: 'La adaptación espera datos de buena calidad.',
    /** With a watch that sends only the pulse (ADR-51). */
    heartRateOnly: 'Estimado solo con tu pulso',
    heartRateOnlyNotice: 'Tu reloj envía el pulso, pero no el tiempo entre latidos. La música se adapta con una estimación más simple, solo con tu pulso.',
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
