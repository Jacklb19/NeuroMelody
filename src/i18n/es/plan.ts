/** Spanish copy of the session plan screen (ADR-25, ADR-30). */
export const plan = {
  pageTitle: 'Prepara tu sesión',
  eyebrow: 'Antes de escuchar',
  introduction: 'Elige tu intención, el tiempo y cómo quieres que suene. Puedes cambiarlo la próxima vez.',
  durationLegend: '¿Cuánto tiempo tienes?',
  /** A duration in words, e.g. "20 minutos": name of each option and the chosen plan. */
  minutes: (minutes: number): string => `${String(minutes)} minutos`,
  /** Unit printed under the figure of each duration option. */
  minutesUnit: 'min',
  /** Optional goal (HU-07, ADR-38); `names` and `programs` keys mirror `GoalId`. */
  goals: {
    legend: '¿Cuál es tu intención hoy?',
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
  /** Plan composed by the language model from what the person writes (ADR-68); the person decides. */
  compose: {
    question: '¿Cómo te sientes hoy o qué quieres escuchar?',
    placeholder: 'Por ejemplo: estoy estudiando y quiero algo tranquilo unos 30 minutos',
    send: 'Enviar',
    working: 'Armando tu plan…',
    /** Shown only near the limit. */
    remaining: (count: number): string => (count === 1 ? 'Queda 1 carácter' : `Quedan ${String(count)} caracteres`),
    resultTitle: 'Tu plan',
    generatedMark: 'Propuesta automática',
    noGoal: 'Sin intención',
    modes: { adaptive: 'Sigue tu pulso', fixed: 'Música fija' },
    use: 'Usar esta configuración y empezar sesión',
    dismiss: 'No, gracias',
    /** `reason` is one of the cloud error sentences. */
    failed: (reason: string): string => `No pude armar el plan: ${reason} Puedes elegirlo abajo.`,
  },
  /** Sound worlds (ADR-64); `names` and `descriptions` keys mirror `WorldId`. */
  worlds: {
    legend: '¿En qué mundo sonoro?',
    hint: 'Cada mundo reúne un sonido, un ambiente y una textura, y le da su propio color a la escucha. Si prefieres, ajústalos tú debajo.',
    names: {
      misty_forest: 'Bosque de niebla',
      night_coast: 'Costa nocturna',
      city_rain: 'Lluvia en la ciudad',
      high_moor: 'Páramo al amanecer',
      deep_space: 'Espacio profundo',
      quiet_room: 'Habitación en calma',
    },
    descriptions: {
      misty_forest: 'Cuencos que resuenan largo, con viento entre los árboles.',
      night_coast: 'Sonido cálido sobre el vaivén del mar.',
      city_rain: 'Piano tranquilo con lluvia en la ventana.',
      high_moor: 'Pocas notas y viento abierto, con mucho aire.',
      deep_space: 'Sonido cálido y envolvente, sin nada de fondo.',
      quiet_room: 'Solo un piano, cercano y sin adornos.',
    },
    /** Shown when the choices below match no world. */
    custom: 'Tu combinación no es ninguno de los mundos: es tuya.',
    /** Line of the session card and of the session heading. */
    chosen: (world: string): string => `Mundo: ${world}`,
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
    `Los primeros ${String(minutes)} minutos la música va ${level.toLocaleLowerCase('es')} y no cambia mientras aprende tu ritmo de hoy. Después se adapta a ti.`,
  continueToSession: 'Empezar sesión',
};
