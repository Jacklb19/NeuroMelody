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
    title: 'Prepara tu sesión en tres pasos',
    text: 'Elige qué buscas, cuánto tiempo tienes y con qué ambiente. La música parte de tu pulso y te acompaña desde ahí.',
    action: 'Preparar mi sesión',
    /** Starts a session like the last one: same goal and length, and the ambience kept on the device. */
    repeat: 'Repetir la última',
  },
  goals: {
    title: 'O empieza por lo que buscas',
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
  first: {
    title: 'Tu primera sesión, en tres pasos',
    steps: {
      connect: { title: 'Prepara y conecta tu pulso', text: 'Elige qué buscas y mide tu pulso con una banda, con la cámara o con un pulso de ejemplo.' },
      listen: { title: 'Inicia la música', text: 'Empieza cerca de tu pulso mientras aprende tu ritmo de hoy.' },
      rest: { title: 'Déjate llevar', text: 'No tienes que hacer nada más.' },
    },
  },
  notice: 'Herramienta de bienestar. No es un dispositivo médico ni mide el dolor.',
};
