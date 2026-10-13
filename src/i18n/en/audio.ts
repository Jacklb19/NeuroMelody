/** English copy of the audio area (ADR-25). */
export const audio = {
  /** Names of the music levels; keys mirror `LevelId`. */
  levels: {
    high: 'High activation',
    intermediate: 'Intermediate',
    target: 'Low activation (goal)',
    sleep: 'For sleep',
  },
  /** Names of the musical modes; keys mirror the names in `MODE`. */
  modes: {
    majorPentatonic: 'Major pentatonic',
    lydian: 'Lydian',
    dronePentatonic: 'Drone with pentatonic',
    deepDrone: 'Deep drone',
  },
  /** Playback panel of the session screen. */
  playback: {
    title: 'Music',
    volumeNotice: 'Use a moderate volume on your device.',
    start: 'Start music',
    volume: 'Volume',
    stop: 'Stop',
    statusLabel: 'Music status:',
    /** Keys mirror `AudioState`. */
    states: {
      idle: 'Ready to start',
      loading: 'Preparing the audio…',
      playing: 'Playing',
      stopped: 'Stopped',
      error: 'The audio could not be started',
    },
    finished: 'The session ended',
    /** `detail` explains the failure: an engine error or `browserRefused`. */
    unavailable: (detail: string): string => `Audio is not available in this browser (${detail}).`,
    browserRefused: 'the browser did not allow it to start',
    planEndedTitle: 'The planned session ended',
    continuousListeningTitle: (minutes: number): string => `You have been listening for ${String(minutes)} minutes without a break`,
    fadeNotice: (minutes: number): string =>
      `If you do not respond, the music will switch off in ${String(minutes)} minutes with a gentle fade-out.`,
    continue: 'Continue',
    finish: 'Finish',
    /** Shown by the operating system's media controls. */
    mediaArtist: 'Listening session',
  },
  /** Failures of the audio engine; keys mirror `AudioEngineErrorCode`. */
  errors: {
    missing_parameter: ({ parameter }: { readonly parameter: string }): string =>
      `The synthesizer does not expose the ${parameter} parameter.`,
  },
};
