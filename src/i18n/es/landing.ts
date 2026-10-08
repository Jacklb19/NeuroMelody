import { common } from './common';

/**
 * Spanish copy of the public landing page (ADR-25, ADR-28). Descriptive,
 * never clinical: it explains what the app does without promising effects.
 */
export const landing = {
  pageTitle: 'Música que sigue tu ritmo',
  /** Accessible name of the landing navigation. */
  navigationLabel: 'Secciones',
  nav: {
    howItWorks: 'Cómo funciona',
    sources: 'Fuentes',
    privacy: 'Privacidad',
    technology: 'Tecnología',
    openApp: 'Abrir la app',
  },
  hero: {
    eyebrow: 'Música generativa · variabilidad cardíaca',
    /** The headline is split so its middle line can carry the accent. */
    title: { before: 'Música que', accent: 'escucha', after: 'el ritmo de tu corazón' },
    lead:
      'NeuroMelody compone música en tu navegador y la ajusta, poco a poco, a cómo varían tus latidos. Una compañía sonora para hacer una pausa, respirar y descansar.',
    start: 'Empezar a escuchar',
    howItWorks: 'Ver cómo funciona',
    note: 'Herramienta de bienestar. No es un dispositivo médico ni mide el dolor.',
    /** Text alternative of the 3D scene. */
    sceneLabel: 'Esfera de partículas que late al ritmo de un corazón simulado, rodeada por las cinco líneas de un pentagrama.',
  },
  /** Live readout of the simulated heart under the hero; never real data. */
  sample: {
    label: 'Ejemplo simulado',
    heartRate: 'Frecuencia',
    rmssd: 'Variabilidad (RMSSD)',
    lastBeat: 'Último intervalo',
  },
  about: {
    eyebrow: 'Qué es',
    title: 'Un acompañamiento sonoro, no un tratamiento',
    body:
      'Pensada como apoyo para personas que conviven con dolor crónico, NeuroMelody convierte la señal de tu corazón en una música que se mueve contigo. No interpreta tu salud ni reemplaza a tu equipo de cuidado: solo escucha y acompaña.',
    /** Keys mirror `LANDING_HIGHLIGHT_IDS`. */
    highlights: {
      generative: {
        title: 'Compuesta en vivo',
        text: 'Cada sesión se genera nota a nota en tu dispositivo. No hay pistas grabadas que se repitan.',
      },
      listening: {
        title: 'Atenta a tu señal',
        text: 'Lee los intervalos entre latidos y calcula cuánto varían, sin diagnosticar ni sacar conclusiones.',
      },
      gradual: {
        title: 'Sin cambios bruscos',
        text: 'Un estado nuevo se confirma varias veces antes de que la música cambie, y siempre con transiciones lentas.',
      },
    },
  },
  steps: {
    eyebrow: 'Cómo funciona',
    title: 'De un latido a una nota, en cuatro pasos',
    intro: 'Todo ocurre dentro de tu navegador, en hilos separados para que la música nunca se corte.',
    /** Keys mirror `LANDING_STEP_IDS`; the figures come from the app's own constants. */
    items: {
      signal: {
        title: 'Señal',
        text: 'Una banda de pecho, la cámara del celular, un registro de ejemplo o el simulador envían cada latido.',
      },
      analysis: {
        title: 'Análisis',
        text: (windowMinutes: number): string =>
          `Un hilo aparte calcula la frecuencia y la variabilidad (RMSSD, SDNN, LF/HF) sobre los últimos ${String(windowMinutes)} minutos.`,
      },
      state: {
        title: 'Estado',
        text: (calibrationMinutes: number): string =>
          `Tras ${String(calibrationMinutes)} minutos de calibración, unas reglas estiman si estás más activo, más tranquilo o cerca de tu punto de partida.`,
      },
      music: {
        title: 'Música',
        text: 'El motor de audio ajusta tempo, modo y capas con rampas lentas, en su propio hilo de audio.',
      },
    },
  },
  sources: {
    eyebrow: 'Fuentes de señal',
    title: 'Empieza con lo que tengas a mano',
    experimental: 'Experimental',
    /** Keys mirror `SourceKind`; the names come from the acquisition dictionary. */
    descriptions: {
      simulator: 'Un corazón sintético con escenarios de calma y activación. Funciona en cualquier navegador.',
      recording: 'Registros reales de ritmo cardíaco, públicos y anonimizados, para probar sin sensores.',
      ble: 'Cualquier banda de pecho con el perfil estándar de frecuencia cardíaca, conectada por Bluetooth.',
      camera: 'La yema del dedo sobre la cámara trasera del celular. Menos precisa que una banda.',
    },
  },
  privacy: {
    eyebrow: 'Privacidad',
    title: 'Tu señal se queda contigo',
    /** Keys mirror `LANDING_PRIVACY_IDS`. */
    points: {
      local: 'Sin cuenta, cada sesión se guarda solo en este dispositivo y puedes borrarla cuando quieras.',
      camera: 'La imagen de la cámara se procesa al instante y nunca se guarda ni se envía.',
      account: 'La cuenta es opcional, con segundo factor, y solo sincroniza si das tu consentimiento.',
    },
    link: 'Leer cómo tratamos tus datos',
  },
  technology: {
    eyebrow: 'Tecnología',
    title: 'Hecha con la plataforma web',
    /** Keys mirror `LANDING_TECHNOLOGY_IDS`. */
    items: {
      pwa: { name: 'App web instalable', text: 'Se instala desde el navegador y funciona sin conexión.' },
      audio: { name: 'AudioWorklet', text: 'La síntesis vive en un hilo de audio dedicado, sin cortes.' },
      worker: { name: 'Web Worker', text: 'El análisis de la señal no compite con la interfaz.' },
      bluetooth: { name: 'Web Bluetooth', text: 'Conexión directa con la banda, sin aplicaciones extra.' },
    },
  },
  closing: {
    title: 'Regálate unos minutos',
    text: (minMinutes: number, maxMinutes: number): string =>
      `Elige una sesión de ${String(minMinutes)} a ${String(maxMinutes)} minutos y deja que la música te acompañe.`,
    action: 'Preparar una sesión',
  },
  footer: {
    project: 'Proyecto académico de código abierto.',
    privacy: 'Privacidad',
    diagnostics: 'Diagnóstico del navegador',
    sourceCode: 'Código fuente',
    notice: common.nonClinicalIndicators,
  },
};
