const minutes = (count: number): string => `${String(count)} ${count === 1 ? 'minuto' : 'minutos'}`;

/**
 * Spanish copy of the guided recording (ADR-33). Plain words: it asks for a
 * favour, explains what is kept and promises nothing about the person.
 */
export const collection = {
  pageTitle: 'Ayuda a mejorar la app',
  eyebrow: 'Grabación guiada',
  /** `total` is the length of the whole protocol, in minutes. */
  introduction: (total: number): string =>
    `La app estima cómo estás con un modelo que aprendió de otras personas. Con una grabación guiada de unos ${minutes(total)} puede aprender también de ti. Es opcional y no cambia nada de tus sesiones.`,
  minutes,
  steps: {
    title: 'Qué vas a hacer',
  },
  /** Keys mirror `CollectionStageId`. Every instruction receives the numbers of the counting task, which only that stage uses. */
  stages: {
    rest: {
      name: 'Reposo',
      summary: 'Sentarte en silencio, sin hacer nada.',
      instruction: (): string => 'Siéntate cómodo, con la espalda apoyada. No hables ni mires el celular: solo quédate quieto y respira como siempre.',
      during: 'Quédate quieto y respira como siempre. No tienes que hacer nada.',
    },
    slow_breathing: {
      name: 'Respiración lenta',
      summary: 'Respirar despacio siguiendo un círculo.',
      instruction: (): string => 'Vas a respirar despacio siguiendo el círculo: inhala cuando crece y exhala cuando se recoge. Sin forzar.',
    },
    demanding_task: {
      name: 'Tarea de concentración',
      summary: 'Restar de cabeza lo más rápido que puedas.',
      instruction: (start: number, step: number): string =>
        `Vas a restar de ${String(step)} en ${String(step)} empezando en ${String(start)}, escribiendo cada resultado lo más rápido que puedas. Es difícil a propósito: no importa si te equivocas.`,
    },
  },
  consent: {
    title: 'Qué se guarda',
    facts: [
      'El tiempo entre un latido y el siguiente, y a qué tramo pertenece cada uno.',
      'Un código al azar de este dispositivo, que no dice quién eres. No se guarda tu nombre ni tu correo.',
      'Todo queda en este dispositivo. Nada se envía solo: al terminar puedes exportarla o, si quieres, enviarla para entrenar el modelo. Las dos cosas las decides tú.',
      'Puedes borrar cada grabación cuando quieras, aquí mismo.',
    ],
    label: 'Acepto que esta grabación se guarde en este dispositivo para poder exportarla.',
  },
  begin: 'Empezar la grabación',
  connectFirst: 'Primero conecta abajo cómo vas a medir tu pulso.',
  consentFirst: 'Marca la casilla para continuar.',
  /** Shown with the simulator or a sample recording. */
  demoSource: 'Estás en modo de prueba: puedes ver cómo funciona, pero esos latidos no son tuyos y al terminar no se guarda nada.',
  trialDone: {
    title: 'Prueba terminada',
    text: 'Así es la grabación guiada. No se guardó nada, porque los latidos no eran tuyos. Cuando quieras hacerla de verdad, conecta la banda o la cámara.',
    again: 'Volver al principio',
  },
  stageCount: (current: number, total: number): string => `Tramo ${String(current)} de ${String(total)}`,
  startStage: 'Empezar este tramo',
  stopAnytime: 'Puedes parar cuando quieras.',
  cancel: 'Dejarlo por ahora',
  /** The signal started over in the middle of a stage. */
  interrupted: 'Se cortó la señal a mitad del tramo. Hay que grabarlo otra vez desde el principio.',
  progressLabel: 'Tiempo del tramo',
  remaining: (clock: string): string => `Quedan ${clock}`,
  task: {
    question: (current: number, step: number): string => `¿Cuánto es ${String(current)} menos ${String(step)}?`,
    submit: 'Siguiente',
    hurry: 'Lo más rápido que puedas.',
    wrong: (current: number): string => `No es ese. Sigue desde ${String(current)}.`,
  },
  saved: {
    title: 'Grabación guardada',
    text: 'Gracias. Quedó en este dispositivo. Para que sirva puedes enviarla desde la lista de abajo o exportarla. El modelo no cambia solo dentro de la app: se entrena aparte y una persona aprueba cada versión.',
    export: 'Exportar mis grabaciones',
    home: 'Volver al inicio',
    /** File name without extension, e.g. "neuromelody-grabaciones-2026-10-12". */
    fileName: (prefix: string, date: string): string => `${prefix}-grabaciones-${date}.json`,
  },
  saveFailed: {
    title: 'No se pudo guardar',
    text: 'La grabación no quedó guardada en este dispositivo. Puedes intentarlo de nuevo.',
    retry: 'Volver a empezar',
  },
  /** Sending a recording to train the classifier: always the person's choice, one at a time, and reversible. */
  share: {
    offer: 'Enviar para entrenar el modelo',
    explanation: 'Se envían los latidos de esta grabación, el nombre de cada tramo y el código al azar de este dispositivo. No tu nombre ni tu correo. Se usan solo para entrenar el modelo de la app y puedes retirarla cuando quieras, borrándola aquí.',
    accept: 'Acepto y la envío',
    sending: 'Enviando…',
    sent: 'Enviada para entrenar el modelo',
    confirmDeleteSent: 'Sí, borrarla aquí y retirarla',
    /** Why it cannot be sent; keys mirror the availabilities that prevent it. */
    needs: {
      signed_out: 'Para enviar una grabación al entrenamiento del modelo hace falta una cuenta con verificación en dos pasos.',
      needs_second_factor: 'Para enviar una grabación al entrenamiento del modelo hace falta la verificación en dos pasos, porque son tus latidos.',
    },
    /** `reason` is one of the cloud error sentences. */
    failed: (reason: string): string => `No se pudo completar: ${reason} La grabación sigue en este dispositivo.`,
  },
  list: {
    title: 'Tus grabaciones',
    about: 'El archivo exportado lleva los latidos de cada tramo y el código al azar de este dispositivo. Nada más.',
    exportAll: (count: number): string => `Exportar ${String(count)} ${count === 1 ? 'grabación' : 'grabaciones'}`,
    /** Source and size of one recording, e.g. "Banda Bluetooth · 742 latidos". */
    detail: (source: string, beats: number): string => `${source} · ${String(beats)} latidos`,
    delete: 'Borrar',
    confirmDelete: 'Sí, borrar esta grabación',
  },
};
