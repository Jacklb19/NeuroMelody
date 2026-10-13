/**
 * Spanish copy of the public landing page (ADR-25, ADR-28, ADR-30). Written
 * for anyone, without technical terms; descriptive, never clinical: it says
 * what the app does without promising effects.
 */
export const landing = {
  pageTitle: 'Música que sigue tu ritmo',
  /** Accessible name of the landing navigation. */
  navigationLabel: 'Secciones',
  nav: {
    howItWorks: 'Cómo funciona',
    moments: 'Para qué sirve',
    privacy: 'Privacidad',
    signIn: 'Iniciar sesión',
    register: 'Crear cuenta',
  },
  hero: {
    eyebrow: 'Música que se adapta a ti',
    title: 'Música que sigue el ritmo de tu corazón',
    lead:
      'NeuroMelody crea música en el momento y la va ajustando, poco a poco, al ritmo de tus latidos. Una compañía sonora para hacer una pausa, respirar y descansar.',
    start: 'Empezar gratis',
    howItWorks: 'Ver cómo funciona',
    note: 'Herramienta de bienestar. No es un dispositivo médico ni mide el dolor.',
    /** Text alternative of the 3D scene. */
    sceneLabel: 'Esfera de partículas que late al ritmo de un corazón simulado, rodeada por las cinco líneas de un pentagrama.',
  },
  /** Live readout of the simulated heart under the hero; never real data. */
  sample: {
    label: 'Ejemplo simulado',
    heartRate: 'Pulso',
    rmssd: 'Variación entre latidos',
    lastBeat: 'Último latido',
  },
  about: {
    eyebrow: 'Qué es',
    title: 'Tu pulso se convierte en música',
    body:
      'NeuroMelody nació para acompañar a personas que conviven con dolor crónico, y sirve también para calmarte, descansar antes de dormir, respirar más despacio o tomar una pausa. Escucha tu corazón y compone para ti una música que se mueve contigo. No reemplaza a tu equipo de cuidado: solo escucha y acompaña.',
    /** Text alternative of the drawing that turns a heartbeat trace into notes on a staff. */
    drawingLabel: 'Un trazo de latidos que se transforma en notas sobre un pentagrama.',
    /** Keys mirror `LANDING_HIGHLIGHT_IDS`. */
    highlights: {
      generative: {
        title: 'Única cada vez',
        text: 'La música nace en el momento, nota a nota. Ninguna sesión suena igual que otra.',
      },
      listening: {
        title: 'Atenta a ti',
        text: 'Sigue el ritmo de tus latidos mientras escuchas, sin juzgar ni sacar conclusiones.',
      },
      gradual: {
        title: 'Siempre suave',
        text: 'Los cambios llegan despacio, sin sobresaltos, para que solo tengas que dejarte llevar.',
      },
    },
  },
  steps: {
    eyebrow: 'Cómo funciona',
    title: 'De un latido a una melodía',
    intro: 'Todo ocurre en tu dispositivo, mientras escuchas.',
    /** Keys mirror `LANDING_STEP_IDS`; the figures come from the app's own constants. */
    items: {
      signal: {
        title: 'Conecta tu pulso',
        text: 'Con una banda de pecho, con la cámara del celular o, para probar, con un pulso de ejemplo.',
      },
      analysis: {
        title: 'La app te escucha',
        text: 'Sigue cada latido y observa cómo cambia tu ritmo a lo largo de la sesión.',
      },
      state: {
        title: 'Encuentra tu punto de partida',
        text: (calibrationMinutes: number): string =>
          `Durante los primeros ${String(calibrationMinutes)} minutos aprende cómo estás hoy. Después, un modelo entrenado con datos de investigación estima si te vas calmando.`,
      },
      music: {
        title: 'La música te acompaña',
        text: 'El ritmo y las capas de la música bajan o se sostienen contigo, siempre con suavidad.',
      },
    },
  },
  moments: {
    eyebrow: 'Para qué sirve',
    title: 'Un rato para ti, cuando lo necesites',
    /** Keys mirror `GoalId`; the names come from the plan dictionary. */
    descriptions: {
      relax: 'Soltar la tensión del día con una música que no pide nada.',
      rest_before_sleep: 'Bajar el ritmo antes de acostarte.',
      calm_after_activity: 'Volver a tu paso después de moverte o de un momento intenso.',
      slow_breathing: 'Dejar que la música marque un respirar tranquilo.',
      pause: 'Diez minutos sin pantallas ni pendientes.',
    },
  },
  sources: {
    eyebrow: 'Cómo medir tu pulso',
    title: 'Empieza con lo que tengas a mano',
    experimental: 'En pruebas',
    /** Keys mirror `SourceKind`; the names come from the acquisition dictionary. */
    descriptions: {
      simulator: 'Un pulso de ejemplo para conocer la app sin ningún aparato.',
      recording: 'Latidos reales grabados, para ver cómo responde la música.',
      ble: 'La opción más precisa: una banda de pecho con Bluetooth.',
      camera: 'La yema del dedo sobre la cámara trasera del celular.',
    },
  },
  privacy: {
    eyebrow: 'Privacidad',
    title: 'Tu pulso se queda contigo',
    /** Keys mirror `LANDING_PRIVACY_IDS`. */
    points: {
      local: 'Tus sesiones se guardan en tu dispositivo y puedes borrarlas cuando quieras.',
      camera: 'La imagen de la cámara nunca se guarda ni se envía.',
      account: 'Con tu cuenta, nada se sincroniza sin tu permiso.',
    },
    link: 'Leer cómo cuidamos tus datos',
  },
  closing: {
    title: 'Regálate unos minutos',
    text: (minMinutes: number, maxMinutes: number): string =>
      `Elige una sesión de ${String(minMinutes)} a ${String(maxMinutes)} minutos y deja que la música te acompañe.`,
    action: 'Crear mi cuenta',
    secondary: 'Ya tengo cuenta',
  },
  footer: {
    project: 'Proyecto académico.',
    privacy: 'Privacidad',
    notice: 'NeuroMelody es una herramienta de bienestar. No es un dispositivo médico, no mide el dolor y no sustituye un tratamiento.',
  },
};
