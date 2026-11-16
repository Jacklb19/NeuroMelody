/** Spanish copy of the app's start screen (ADR-25, ADR-30). */
export const home = {
  pageTitle: 'Inicio',
  /** Keys mirror `DayPart`. */
  greetings: {
    morning: 'Buenos días',
    afternoon: 'Buenas tardes',
    evening: 'Buenas noches',
  },
  /** Greeting for someone whose name is known, e.g. "Buenas tardes, Ana". */
  greetingWithName: (greeting: string, name: string): string => `${greeting}, ${name}`,
  question: '¿Qué necesitas ahora?',
  start: {
    eyebrow: 'Nueva sesión',
    title: 'Prepara tu próxima sesión',
    text: 'Elige tu intención, el tiempo y cómo quieres que suene. Prepara tu pausa y empieza cuando quieras.',
    action: 'Preparar mi sesión',
    /** Starts a session like the last one: same goal and length, and the ambience kept on the device. */
    repeat: 'Repetir la última',
    /** Music without a sensor or a plan (P-17). */
    listen: 'O solo escuchar música',
    /** The melody saved most recently, with the way to hear it. */
    lastMelody: 'Tu última melodía:',
    hearMelody: (name: string): string => `Oír ${name}`,
  },
  goals: {
    title: 'O empieza por una intención',
    hint: 'Cada intención cambia cómo empieza la música y hasta dónde baja.',
    /** What the music does with each goal, in a few words; keys mirror `GoalId`. */
    taglines: {
      relax: 'De paso medio a la calma',
      rest_before_sleep: 'Baja hasta lo más lento y se apaga sola',
      calm_after_activity: 'Empieza movida y baja contigo',
      slow_breathing: 'Calmada desde el inicio, con respiración guiada',
      pause: 'Ligera y estable, para un rato corto',
    },
  },
  activity: {
    title: 'Tu actividad',
    sessions: 'Sesiones',
    minutes: 'Minutos escuchados',
    seeHistory: 'Ver historial',
    seeProgress: 'Ver tu progreso',
  },
  last: {
    title: 'Tu última sesión',
    /** Listening time and goals of the last session on one line. */
    detail: (listened: string, goals: string): string => `${listened} · ${goals}`,
    view: 'Ver resumen',
  },
  /** Shown instead of the activity until there is a first session; keys mirror `FIRST_SESSION_STEP_IDS`. */
  /** Everything else the app offers, in sight from the start screen; `items` keys mirror `ExploreId`. */
  explore: {
    title: 'Explora NeuroMelody',
    hint: 'Más allá de una sesión: lo que puedes ver, guardar y aportar.',
    items: {
      listen: { title: 'Escuchar', text: 'Música que se crea mientras la oyes, en seis mundos sonoros y sin sensor. Guarda las melodías que te gusten.' },
      progress: { title: 'Tu progreso', text: 'Cómo cambian tu pulso y tus valoraciones, y qué elecciones te sientan mejor.' },
      report: { title: 'Informe para compartir', text: 'Un resumen imprimible de tus sesiones para llevar a quien te acompaña.' },
      reminder: { title: 'Recordatorio', text: 'Añade a tu calendario la hora y los días en que quieres escuchar.' },
      collect: { title: 'Ayuda a entrenar la IA', text: 'Una grabación guiada de 15 minutos que mejora el modelo para todos.' },
      diagnostics: { title: 'Revisa tu equipo', text: 'Comprueba el sonido, el Bluetooth y la cámara antes de empezar.' },
    },
  },
  first: {
    title: 'Así es tu primera sesión',
    steps: {
      connect: { title: 'Prepara y conecta tu pulso', text: 'Elige tu intención y mide tu pulso con una banda, con la cámara o con un pulso de ejemplo.' },
      listen: { title: 'Inicia la música', text: 'Empieza cerca de tu pulso mientras aprende tu ritmo de hoy.' },
      rest: { title: 'Déjate llevar', text: 'No tienes que hacer nada más.' },
    },
  },
  notice: 'Herramienta de bienestar. No es un dispositivo médico ni mide el dolor.',
};
