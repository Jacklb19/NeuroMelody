/** Spanish copy of the session plan screen (ADR-25, ADR-30). */
export const plan = {
  pageTitle: 'Prepara tu sesión',
  eyebrow: 'Antes de escuchar',
  introduction: 'Dos decisiones y listo. Puedes cambiarlas la próxima vez.',
  durationLegend: '¿Cuánto tiempo tienes?',
  /** A duration in words, e.g. "20 minutos": name of each option and the chosen plan. */
  minutes: (minutes: number): string => `${String(minutes)} minutos`,
  /** Unit printed under the figure of each duration option. */
  minutesUnit: 'min',
  /** Optional goals (HU-07); `names` keys mirror `GoalId`. */
  goals: {
    legend: '¿Qué buscas hoy?',
    hint: 'Opcional. Puedes elegir más de una.',
    names: {
      relax: 'Relajarme',
      rest_before_sleep: 'Descansar antes de dormir',
      calm_after_activity: 'Recuperar la calma después de una actividad',
      slow_breathing: 'Acompañar una respiración lenta',
      pause: 'Tomar una pausa para mí',
    },
  },
  /** Length proposed by the language model (RF-13); the person decides. */
  suggestion: {
    ask: 'Proponme una duración',
    /** What travels, said next to the button. */
    notice: 'Un modelo de lenguaje recibe solo los objetivos que marcaste y la hora que es. Tú decides si usas lo que proponga.',
    needsGoal: 'Marca al menos un objetivo para pedir una propuesta.',
    signedOut: 'Con una cuenta, la app puede proponerte la duración según lo que buscas.',
    signIn: 'Entrar',
    working: 'Pensando la propuesta…',
    /** The proposed length, in the words of `minutes`. */
    proposal: (duration: string): string => `Propuesta: ${duration}`,
    generatedMark: 'Texto generado automáticamente.',
    accept: 'Usar esta duración',
    accepted: 'Es la duración que tienes elegida.',
    /** `reason` is one of the cloud error sentences. */
    failed: (reason: string): string => `No se pudo pedir la propuesta: ${reason} Puedes elegir tú la duración.`,
  },
  summaryLabel: 'Tu sesión',
  noGoals: 'Sin intención elegida',
  calibrationNote: (level: string, minutes: number): string =>
    `La música empieza en el nivel ${level} durante los primeros ${String(minutes)} minutos, mientras aprende tu ritmo de hoy.`,
  continueToSession: 'Empezar sesión',
};
