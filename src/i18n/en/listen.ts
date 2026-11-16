/**
 * English copy of the listening screen (P-17): music generated while it
 * plays, with no sensor, and the melodies the person keeps. It describes
 * what sounds; it never says what the music does for anyone.
 */
export const listen = {
  pageTitle: 'Listen',
  /** Title of the browser tab while the melodies tab is open. */
  melodiesPageTitle: 'My melodies',
  eyebrow: 'Music without a sensor',
  introduction: 'Music created as you hear it. It needs no sensor and no preparation, and it never sounds the same twice unless you save the melody.',
  tabsLabel: 'Sections of Listen',
  tabs: {
    create: 'Create',
    melodies: (count: number): string => (count === 0 ? 'My melodies' : `My melodies (${String(count)})`),
  },
  create: {
    worldLegend: 'Which world?',
    worldHint: 'Each world brings together a sound, an ambience and a texture, with its own colour.',
    levelLegend: 'At what pace?',
    levelHint: 'The pace holds while it plays: here the music does not follow your pulse.',
    levelTempo: (bpm: number): string => `${String(bpm)} beats per minute`,
    adjust: 'Adjust by hand',
    adjustHint: 'Sound, ambience and texture one by one.',
  },
  player: {
    label: 'Player',
    /** What the player is doing, keyed by its phase. */
    phases: { ready: 'Ready to play', playing: 'Now playing', paused: 'Paused', ended: 'Finished' },
    /** The sound chosen by hand matches no world. */
    custom: 'Your combination',
    unsaved: 'The last piece you heard, not saved',
    durationLegend: 'For',
    minutes: (minutes: number): string => `${String(minutes)} min`,
    minutesLong: (minutes: number): string => `${String(minutes)} minutes`,
    remaining: (clock: string): string => `${clock} left`,
    play: 'Play',
    resume: 'Resume',
    newPiece: 'New piece',
    restart: 'Start this piece again',
    save: 'Save this melody',
    saved: 'Saved',
    savedNotice: 'Saved in My melodies.',
    viewSaved: 'View',
    /** The choices of the create tab no longer match what sounds. */
    nextNotice: 'The new choices will play when you press New piece.',
    olderSound: 'It may sound a little different: the sound of the app was updated.',
    full: (max: number): string => `You have ${String(max)} saved melodies. Delete one to save another.`,
    goToMelodies: 'Go to My melodies',
    saveFailed: 'The melody could not be saved on this device.',
    sessionQuestion: 'Would you like the music to follow your pulse?',
    sessionAction: 'Start a session with this sound',
  },
  save: {
    title: 'Save this melody',
    nameLabel: 'Name',
    hint: (max: number): string => `Up to ${String(max)} characters. The minute you are at is saved too, so you can go on from there.`,
    confirm: 'Save',
    /** Proposed name: the world (or the sound) and the day. */
    defaultName: (place: string, date: string): string => `${place} · ${date}`,
  },
  melodies: {
    listLabel: 'Saved melodies',
    empty: 'When something sounds right, save it and it will be here to hear again.',
    create: 'Create one',
    play: 'Listen',
    fromStart: 'From the start',
    fromMinute: (minute: number): string => `From minute ${String(minute)}`,
    playing: 'Playing',
    more: (name: string): string => `More options for ${name}`,
    rename: 'Rename',
    renameSave: 'Save name',
    delete: 'Delete',
    deleteConfirm: 'Yes, delete',
    pending: 'Not uploaded yet',
    savedOn: (date: string): string => `Saved on ${date}`,
    minute: (minute: number): string => `minute ${String(minute)}`,
    /** Where the melodies stand with the cloud, keyed by `MelodyCloudState`. */
    cloud: {
      local: 'Saved on this device.',
      syncing: 'Syncing with your account…',
      synced: 'Saved in your account and on this device.',
      offline: 'No connection: they will be uploaded when it is back.',
      full: 'Your account already keeps as many as it can in the cloud; the rest stay on this device.',
    },
    failed: 'The melodies of this device could not be read.',
  },
};
