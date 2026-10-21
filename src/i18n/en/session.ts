import { common } from './common';

/** English copy of the session area (ADR-25). */
export const session = {
  title: 'Session',
  eyebrow: 'Your listening space',
  /** Planned duration under the heading. */
  plan: (minutes: number): string => `Plan: ${String(minutes)} minutes.`,
  /** Dark layer of a session for falling asleep (ADR-41): the text of the button that removes it. */
  dimmer: {
    restore: 'Screen dimmed for sleep. Tap to see it.',
  },
  /** The session as three slides (ADR-47); `names` and `leads` keys mirror `SlideId`. */
  slides: {
    label: 'Session steps',
    names: { pulse: 'Your pulse', arrival: 'How you arrive', listening: 'Listening' },
    leads: {
      pulse: 'Choose how to measure your pulse and connect it. Once it arrives, we move on.',
      arrival: 'This is how you are right now. If you like, say how you feel before starting.',
    },
    next: 'Continue',
    withoutPulse: 'Continue without measuring my pulse',
    /** Mark of a finished step, and the same for a screen reader. */
    doneMark: '✓',
    done: 'done',
  },
  /** Second slide: the pulse now and what was chosen. */
  arrival: {
    pulseLabel: 'Your pulse now',
    noPulse: 'Without your pulse connected the music plays, but it does not adapt to you.',
    measure: 'Connect my pulse',
    choicesLabel: 'What you chose for this session',
  },
  /** The steps the music of a session can take, in plain words; `levels` keys mirror `LevelId`. */
  journey: {
    label: 'Path of the music',
    levels: { high: 'With movement', intermediate: 'At a middle pace', target: 'Calm', sleep: 'For sleep' },
  },
  /** What the music did, shown when the session ends (ADR-42). */
  recap: {
    title: 'What the music did',
    tempo: (from: string, to: string): string => `It started at ${from} beats per minute and ended at ${to}.`,
    steadyTempo: (tempo: string): string => `It stayed at ${tempo} beats per minute.`,
    noSteps: 'It did not change step during the session.',
    calmerStep: (minute: number, level: string): string => `Minute ${String(minute)}: it came down to "${level}".`,
    livelierStep: (minute: number, level: string): string => `Minute ${String(minute)}: it went back to "${level}" to keep you company.`,
  },
  technicalDetails: {
    title: 'Technical details',
    hint: 'Signal chart, indicators and musical parameters',
  },
  checkIn: {
    ratingBeforeLegend: 'How do you feel before starting?',
    /** Reminder of the rating given before starting, out of the scale's maximum. */
    ratingBefore: (rating: number, maxRating: number): string =>
      `When you started, you felt ${String(rating)} out of ${String(maxRating)}.`,
    saved: 'Session saved on this device.',
    savedDetail: 'You can review it and download it whenever you like.',
    viewSummary: 'View session summary',
    /** After a session made with a trial source. */
    trialEnded: 'It was a trial session and was not saved.',
    trialEndedDetail: 'To save your sessions and see your progress, measure your pulse with a strap or with the camera.',
    saveFailed: (reason: string): string => `The session could not be saved on this device (${reason}).`,
  },
  /** Guided breathing under the orb (ADR-33): a pace to follow, never a promise of an effect. */
  breathing: {
    toggle: 'Breathe with the music',
    /** Keys mirror `BreathPhase`. */
    phases: {
      inhale: 'Breathe in',
      exhale: 'Breathe out',
    },
    hint: 'No need to force it. If it feels uncomfortable, go back to your own pace.',
  },
  progress: {
    label: 'Session progress',
    valueText: (elapsedMinutes: number, plannedMinutes: number): string =>
      `${String(elapsedMinutes)} of ${String(plannedMinutes)} minutes`,
    /**
     * "12:00 of 20:00". The elapsed part is passed through untouched so the
     * screen can emphasise it, and each language can place it where it fits.
     */
    clock: <T>(elapsed: T, planned: string): readonly (T | string)[] => [elapsed, ` of ${planned}`],
    /** Time listened past the plan, appended to the clock. */
    extra: (extra: string): string => ` · ${extra} more`,
  },
  stage: {
    eyebrow: 'Now',
    estimatedState: 'Estimated state:',
    /** The pace of the music now; `personal` when the person's pulse moved it (ADR-39). */
    pace: (tempo: number, personal: boolean): string =>
      `The music is at ${String(tempo)} beats per minute${personal ? ', adjusted to your pulse' : ''}.`,
    help: {
      summary: 'What does it mean?',
      /** With a watch that sends only the pulse, the estimate leaves the variability out (ADR-51). */
      heartRateText: 'The app compares your pulse now with your first minutes. “High” means it rose by at least 10 %: the music steps back to keep you company. “Low” means it fell by at least 10 %, and “Uncertain” that it did not change that much: in both cases the music keeps slowing down little by little. Your watch does not send the time between beats, so this estimate is simpler. It does not measure pain and is not a diagnosis.',
      text: 'The app compares your pulse now with the one of your first minutes. "High" means your pulse rose and the variation between beats fell: the music goes back one step to keep you company. "Low" is the opposite, and "Uncertain" means it did not change enough: in both cases the music keeps coming down little by little. It is an estimate to guide the music; it does not measure pain and it is not a diagnosis.',
    },
    /** Shown while the rules estimate the state, because the trained model could not be loaded. */
    confidence: common.provisionalEstimate,
    /** Shown with the trained model before it has an estimate to be confident about. */
    modelReady: 'Estimated by a model trained on research data',
    /** The model's calibrated probability for the state shown, as a whole percentage. */
    modelConfidence: (percent: number): string => `Estimated by a trained model · ${String(percent)}% confidence`,
    /** With a watch that sends only the pulse (ADR-51). */
    heartRateOnly: 'Estimated from your pulse only',
    heartRateOnlyNotice: 'Your watch sends your pulse but not the time between beats. The music adapts with a simpler estimate, from your pulse only.',
    waitingForQuality: 'The adaptation is waiting for good-quality data.',
    /** Why the music holds its step; the minutes come from the adaptation rules (ADR-12). */
    dwell: (minutes: number): string =>
      `The music holds this step until it completes its minimum duration of ${String(minutes)} minutes.`,
  },
  /**
   * The moment of the session in plain words (ADR-24), keyed by
   * `ListeningNarrativeId`. Descriptive, never clinical (R-06): it compares
   * the body with its own starting point and says what the music does.
   */
  narrative: {
    reconnecting: {
      title: 'Restoring the connection',
      detail: 'The music keeps playing and holds its rhythm while the signal comes back.',
    },
    noSource: {
      title: 'Connect a signal source',
      detail: 'The music can play without a signal, but it only adapts to you when a source is connected.',
    },
    calibrating: {
      title: 'Taking your reference',
      detail: 'For the first few minutes the music stays steady while it learns your starting rhythm.',
    },
    musicStopped: {
      title: 'The music is stopped',
      detail: 'The signal is still coming in. When you start the music, it will follow your rhythm again.',
    },
    unclearSignal: {
      title: 'Waiting for a clear signal',
      detail: 'The music holds its pace. Check that the sensor is positioned properly.',
    },
    high: {
      title: 'Your rhythm is more active than when you started',
      detail: 'The music slows its pace little by little to keep you company.',
    },
    low: {
      title: 'Your rhythm is calmer than when you started',
      detail: 'The music follows that calm and moves towards a slower pace.',
    },
    uncertain: {
      title: 'Your rhythm is staying close to where it started',
      detail: 'The music moves along slowly, with no sudden changes.',
    },
  },
};
