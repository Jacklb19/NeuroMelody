/** Spanish copy of the session plan screen (ADR-25, ADR-30). */
export const plan = {
  pageTitle: 'Prepara tu sesión',
  eyebrow: 'Antes de escuchar',
  introduction: 'Elige lo que buscas, el tiempo y cómo quieres que suene. Puedes cambiarlo la próxima vez.',
  durationLegend: '¿Cuánto tiempo tienes?',
  /** A duration in words, e.g. "20 minutos": name of each option and the chosen plan. */
  minutes: (minutes: number): string => `${String(minutes)} minutos`,
  /** Unit printed under the figure of each duration option. */
  minutesUnit: 'min',
  /** Optional goal (HU-07, ADR-38); `names` and `programs` keys mirror `GoalId`. */
  goals: {
    legend: '¿Qué buscas hoy?',
    hint: 'Opcional. Elige una: cambia cómo empieza la música y hasta dónde baja.',
    /** What the music does in a session with each goal (`programCatalog.ts`). */
    programs: {
      relax: 'La música empieza a paso medio y baja poco a poco hasta su punto más tranquilo.',
      rest_before_sleep: 'Empieza a paso medio y baja más lenta y más oscura que ninguna otra, con una respiración lenta. Al final se apaga sola, sin avisos, y la pantalla se atenúa.',
      calm_after_activity: 'Empieza con más movimiento, cerca de como llegas, y baja contigo en dos pasos.',
      slow_breathing: 'Empieza ya en su punto más tranquilo y marca una respiración lenta.',
      pause: 'Se queda a paso medio, ligera y estable, sin bajar del todo: para una pausa corta.',
    },
    /** The same, for a session with no goal. */
    defaultProgram: 'La música empieza a paso medio y baja poco a poco hasta su punto más tranquilo.',
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
  /** Instrument of the music (ADR-46); `names` keys mirror `InstrumentId`. */
  instrument: {
    legend: '¿Con qué sonido?',
    hint: 'Las mismas notas, tocadas con otro instrumento. La app recuerda tu elección en este dispositivo.',
    names: { warm: 'Cálido', piano: 'Piano', bowls: 'Cuencos' },
    /** Line of the session card. */
    chosen: (instrument: string): string => `Sonido: ${instrument}`,
  },
  /** Ambience under the music (ADR-40); `names` keys mirror `AmbienceId`. */
  ambience: {
    legend: '¿Con qué ambiente?',
    hint: 'Suena de fondo, bajo la música. La app recuerda tu elección en este dispositivo.',
    names: { none: 'Solo música', rain: 'Lluvia', sea: 'Mar', wind: 'Viento' },
    /** Line of the session card, with the name of the ambience in lower case. */
    with: (ambience: string): string => `Con ${ambience.toLowerCase()} de fondo`,
  },
  summaryLabel: 'Tu sesión',
  noGoals: 'Sin intención elegida',
  calibrationNote: (level: string, minutes: number): string =>
    `La música empieza en el nivel ${level} durante los primeros ${String(minutes)} minutos, mientras aprende tu ritmo de hoy.`,
  continueToSession: 'Empezar sesión',
};
