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
  question: '¿Qué te vendría bien ahora?',
  start: {
    eyebrow: 'Tu próxima sesión',
    title: (minutes: number): string => `${String(minutes)} minutos de música a tu ritmo`,
    text: 'Ponte cómodo, conecta tu pulso y deja que la música te acompañe.',
    action: 'Empezar ahora',
    customize: 'Personalizar sesión',
  },
  goals: {
    title: 'Empieza con una intención',
    hint: 'Elige una y ajusta la duración a tu gusto.',
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
      connect: { title: 'Conecta tu pulso', text: 'Con una banda, con la cámara o con un pulso de ejemplo.' },
      listen: { title: 'Inicia la música', text: 'Empieza suave mientras aprende tu ritmo de hoy.' },
      rest: { title: 'Déjate llevar', text: 'No tienes que hacer nada más.' },
    },
  },
  notice: 'Herramienta de bienestar. No es un dispositivo médico ni mide el dolor.',
};
