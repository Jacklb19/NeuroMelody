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
    /** Shown while the rules estimate the state, because the trained model could not be loaded. */
    confidence: common.provisionalEstimate,
    /** Shown with the trained model before it has an estimate to be confident about. */
    modelReady: 'Estimated by a model trained on research data',
    /** The model's calibrated probability for the state shown, as a whole percentage. */
    modelConfidence: (percent: number): string => `Estimated by a trained model · ${String(percent)}% confidence`,
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
