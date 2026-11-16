/**
 * Spanish copy of the listening screen (P-17, ADR-67): music generated while
 * it plays, with no sensor, a player with a time bar, and the melodies the
 * person keeps. It describes what sounds; it never says what the music does
 * for anyone.
 */
export const listen = {
  pageTitle: 'Escuchar',
  /** Title of the browser tab while the melodies tab is open. */
  melodiesPageTitle: 'Mis melodías',
  eyebrow: 'Música sin sensor',
  introduction: 'Música que se crea mientras la oyes. No necesita sensor ni preparación, y nunca suena igual dos veces, salvo que guardes la melodía.',
  tabsLabel: 'Secciones de Escuchar',
  tabs: {
    create: 'Crear',
    melodies: (count: number): string => (count === 0 ? 'Mis melodías' : `Mis melodías (${String(count)})`),
  },
  create: {
    worldLegend: '¿En qué mundo?',
    worldHint: 'Cada mundo reúne un sonido, un ambiente y una textura, con su propio color.',
    levelLegend: '¿A qué paso?',
    levelHint: 'El paso se mantiene mientras suena: aquí la música no sigue tu pulso.',
    levelTempo: (bpm: number): string => `${String(bpm)} pulsos por minuto`,
    durationLegend: '¿Cuánto dura?',
    adjust: 'Ajustes a mano',
    adjustHint: 'Sonido, ambiente y textura por separado.',
  },
  player: {
    label: 'Reproductor',
    /** What the player is doing, keyed by its phase. */
    phases: { ready: 'Listo para sonar', playing: 'Ahora suena', paused: 'En pausa', ended: 'Terminó' },
    /** The sound chosen by hand matches no world. */
    custom: 'Tu combinación',
    unsaved: 'Lo último que sonó, sin guardar',
    minutesLong: (minutes: number): string => `${String(minutes)} minutos`,
    play: 'Reproducir',
    pause: 'Pausar',
    resume: 'Reanudar',
    restart: 'Volver a empezar',
    newPiece: 'Nueva pieza',
    previous: 'Melodía anterior',
    next: 'Melodía siguiente',
    back: (seconds: number): string => `Retroceder ${String(seconds)} segundos`,
    forward: (seconds: number): string => `Avanzar ${String(seconds)} segundos`,
    /** The time bar of the piece. */
    seekLabel: 'Tiempo de la pieza',
    seekValue: (at: string, total: string): string => `${at} de ${total}`,
    seeking: 'Buscando ese momento…',
    savedPoint: (at: string): string => `Punto guardado: ${at}`,
    expand: 'Abrir el reproductor',
    collapse: 'Reducir el reproductor',
    save: 'Guardar esta melodía',
    saved: 'Guardada',
    savedNotice: 'Guardada en Mis melodías.',
    viewSaved: 'Ver',
    /** The choices of the create tab no longer match what sounds. */
    nextNotice: 'Lo nuevo sonará al pulsar Nueva pieza.',
    olderSound: 'Puede sonar algo distinta: el sonido de la app se actualizó.',
    full: (max: number): string => `Tienes ${String(max)} melodías guardadas. Borra alguna para guardar otra.`,
    goToMelodies: 'Ir a Mis melodías',
    saveFailed: 'No se pudo guardar la melodía en este dispositivo.',
    sessionQuestion: '¿Quieres que la música siga tu pulso?',
    sessionAction: 'Haz una sesión con este sonido',
    /** The melodies as a queue beside the open player. */
    queueTitle: 'Tus melodías',
    queueEmpty: 'Todavía no has guardado ninguna. Cuando algo te guste, guárdalo y aparecerá aquí.',
  },
  save: {
    title: 'Guardar esta melodía',
    nameLabel: 'Nombre',
    hint: (max: number): string => `Hasta ${String(max)} caracteres. Se guarda también el momento en que estás.`,
    confirm: 'Guardar',
    /** Proposed name: the world (or the sound) and the day. */
    defaultName: (place: string, date: string): string => `${place} · ${date}`,
  },
  melodies: {
    listLabel: 'Melodías guardadas',
    empty: 'Cuando algo te guste, guárdalo y aquí lo tendrás para volver a oírlo.',
    create: 'Crear una',
    play: 'Escuchar',
    playNamed: (name: string): string => `Escuchar ${name}`,
    playing: 'Sonando',
    more: (name: string): string => `Más opciones de ${name}`,
    rename: 'Renombrar',
    renameSave: 'Guardar nombre',
    delete: 'Borrar',
    deleteConfirm: 'Sí, borrar',
    pending: 'Pendiente de subir',
    savedOn: (date: string): string => `Guardada el ${date}`,
    length: (minutes: number): string => `${String(minutes)} min`,
    /** Where the melodies stand with the cloud, keyed by `MelodyCloudState`. */
    cloud: {
      local: 'Guardadas en este dispositivo.',
      syncing: 'Sincronizando con tu cuenta…',
      synced: 'Guardadas en tu cuenta y en este dispositivo.',
      offline: 'Sin conexión: se subirán cuando vuelva.',
      full: 'Tu cuenta ya guarda en la nube todas las que puede; las demás siguen en este dispositivo.',
    },
    failed: 'No se pudieron leer las melodías de este dispositivo.',
  },
};
