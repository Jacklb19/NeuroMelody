import { common } from './common';

/** "1 point", "3 points": English plural of the self-rating points. */
const points = (count: number): string => `${String(count)} ${count === 1 ? 'point' : 'points'}`;

/** English copy of the summary area (ADR-25). */
export const summary = {
  title: 'Session summary',
  loading: 'Loading…',
  missing: {
    title: 'Session not found',
    detail: 'This session is not saved on this device. It may have been deleted.',
  },
  goToHistory: 'Go to history',
  listenedOf: (listened: string, plannedMinutes: number): string =>
    `You listened for ${listened} of a ${String(plannedMinutes)}-minute plan.`,
  figures: {
    title: 'At the start and at the end',
    heartRate: 'Mean heart rate',
    rmssd: 'Beat-to-beat variability (RMSSD)',
    rmssdTrend: 'Beat-to-beat variability throughout the session',
    lfHfAtEnd: 'LF/HF ratio at the end',
    /** The seconds come from the samples averaged at each end of the session. */
    footnote: (edgeSeconds: number): string =>
      `Each value averages up to ${String(edgeSeconds)} s of good-quality signal at the start and at the end. ` +
      common.nonClinicalIndicators,
  },
  /** Self-rating after listening compared with the one before. */
  ratingChange: {
    same: 'Same as when you started',
    more: (count: number): string => `${points(count)} more than when you started`,
    less: (count: number): string => `${points(count)} less than when you started`,
  },
  stateShare: {
    title: 'How your rhythm moved along',
    empty: 'There was not enough signal to estimate the state during this session.',
    /** Descriptive name of each phase, keyed by `SignalPhase`. */
    phases: {
      calibrating: 'Taking the reference',
      high: 'More active than when you started',
      uncertain: 'Close to where it started',
      low: 'Calmer than when you started',
    },
    footnote: 'Signal time. The state is an estimate from your pulse, not a clinical measurement.',
  },
  /** The session told in plain words by the language model (RF-15); always marked as generated automatically. */
  automatic: {
    label: 'Plain-language summary',
    title: 'Your session in a few words',
    generatedMark: 'Automatically generated text. It describes the figures; it is not an assessment.',
    /** What travels, said before asking: asking is the consent. */
    notice: 'To write it, a language model receives only figures of this session: minutes listened, pulse and variation at the start and at the end, time in each state and your two ratings. It does not receive your name, the date or your heartbeats.',
    ask: 'I agree and want the summary',
    askAgain: 'Ask for another',
    working: 'Writing the summary…',
    /** This deployment has no API to ask. */
    unavailable: 'The automatic summary is not available in this version of the app. All the indicators of the session are above.',
    /** Nobody is signed in; the link to sign in follows. */
    needsAccount: 'The automatic summary needs an account. The session can stay on this device alone.',
    /** `reason` is one of the cloud error sentences. */
    failed: (reason: string): string => `The summary could not be written: ${reason} The indicators above do not change.`,
  },
  download: 'Download data (CSV)',
  viewHistory: 'View history',
  planAnother: 'Set up another session',
  afterRating: {
    label: 'Rating at the end',
    legend: 'How do you feel now that you have finished?',
    save: 'Save rating',
    saveFailed: (reason: string): string => `The rating could not be saved (${reason}).`,
  },
};
