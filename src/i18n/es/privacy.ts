/** Spanish copy of the privacy screen (Ley 1581 de 2012, ADR-18, ADR-25). Descriptive, never clinical. */
export const privacy = {
  pageTitle: 'Privacidad',
  eyebrow: 'Tus datos',
  introduction:
    'NeuroMelody trata datos relacionados con tu salud: el ritmo de tu corazón y cómo te sientes. Por eso todo funciona sin cuenta y nada sale del dispositivo sin tu permiso.',
  /** Sections in order; keys mirror `PRIVACY_SECTION_IDS`. */
  sections: {
    device: {
      title: 'En tu dispositivo',
      /** `seconds` is how often a session stores its indicators. */
      text: (seconds: number): string =>
        `La señal se analiza en el navegador. Las sesiones (indicadores cada ${String(seconds)} segundos, valoraciones y objetivos) se guardan en este dispositivo y puedes borrarlas desde el historial.`,
    },
    camera: {
      title: 'Cámara',
      text: 'Si usas la cámara como fuente, cada imagen se procesa al instante para estimar el pulso y se descarta. No se graba ni se envía.',
    },
    cloud: {
      title: 'En la nube, solo con tu consentimiento',
      text: 'Con una cuenta y el segundo factor activo, puedes sincronizar los indicadores agregados de tus sesiones. Nunca se envía la señal cruda. Los datos se guardan en Supabase con acceso limitado a tu cuenta.',
    },
    summary: {
      title: 'Resumen automático',
      text: 'Si lo pides, un modelo de lenguaje recibe solo cifras agregadas de la sesión para redactar un resumen en palabras sencillas, marcado como generado automáticamente.',
    },
    collection: {
      title: 'Grabaciones guiadas',
      text: 'Si decides hacer una grabación guiada para mejorar el modelo, se guardan en este dispositivo los intervalos entre tus latidos y el nombre de cada tramo, con un código al azar que no dice quién eres. No se envían solas: tú las exportas y decides a quién dárselas, y puedes borrarlas cuando quieras.',
    },
    rights: {
      title: 'Tus derechos',
      text: 'Conforme a la Ley 1581 de 2012, puedes conocer, actualizar, rectificar y suprimir tus datos y retirar tu consentimiento en cualquier momento, desde esta app o escribiendo a los responsables del proyecto.',
    },
  },
  consent: {
    title: 'Consentimiento de sincronización',
    label: 'Acepto que mis indicadores agregados se guarden en la nube para sincronizarlos entre mis dispositivos.',
    given: (date: string): string => `Consentimiento dado el ${date}.`,
    notGiven: 'Sin consentimiento: tus sesiones se quedan solo en este dispositivo.',
    withdrawn: 'Retiraste el consentimiento. Tus sesiones se quedan solo en este dispositivo.',
    /** Where the answer is kept, by whether someone is signed in. */
    stored: {
      device: 'Sin cuenta, tu respuesta se queda en este dispositivo. Al entrar, vale la que tengas en tu cuenta.',
      account: 'Tu respuesta se guarda en tu cuenta. Si lo retiras, tus sesiones dejan de enviarse; las que ya están en la nube puedes borrarlas desde el historial.',
    },
    saveFailed: 'No se pudo guardar tu respuesta en la cuenta. Inténtalo de nuevo.',
  },
  backToAccount: 'Ir a la cuenta',
};
