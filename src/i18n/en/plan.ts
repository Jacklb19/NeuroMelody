/** English copy of the session plan screen (ADR-25, ADR-30). */
export const plan = {
  pageTitle: 'Set up your session',
  eyebrow: 'Before you listen',
  introduction: 'Two choices and you are ready. You can change them next time.',
  durationLegend: 'How much time do you have?',
  /** A duration in words, e.g. "20 minutes": name of each option and the chosen plan. */
  minutes: (minutes: number): string => `${String(minutes)} minutes`,
  /** Unit printed under the figure of each duration option. */
  minutesUnit: 'min',
  /** Optional goals (HU-07); `names` keys mirror `GoalId`. */
  goals: {
    legend: 'What are you looking for today?',
    hint: 'Optional. You can pick more than one.',
    names: {
      relax: 'Relax',
      rest_before_sleep: 'Rest before sleep',
      calm_after_activity: 'Calm down after an activity',
      slow_breathing: 'Accompany slow breathing',
      pause: 'Take a break for myself',
    },
  },
  /** Length proposed by the language model (RF-13); the person decides. */
  suggestion: {
    ask: 'Suggest a length',
    /** What travels, said next to the button. */
    notice: 'A language model receives only the goals you ticked and the time of day. You decide whether to use what it suggests.',
    needsGoal: 'Tick at least one goal to ask for a suggestion.',
    signedOut: 'With an account, the app can suggest a length for what you are after.',
    signIn: 'Sign in',
    working: 'Working on the suggestion…',
    /** The proposed length, in the words of `minutes`. */
    proposal: (duration: string): string => `Suggestion: ${duration}`,
    generatedMark: 'Automatically generated text.',
    accept: 'Use this length',
    accepted: 'It is the length you have chosen.',
    /** `reason` is one of the cloud error sentences. */
    failed: (reason: string): string => `The suggestion could not be requested: ${reason} You can choose the length yourself.`,
  },
  summaryLabel: 'Your session',
  noGoals: 'No intention chosen',
  calibrationNote: (level: string, minutes: number): string =>
    `The music starts at the ${level} level for the first ${String(minutes)} minutes, while it learns your rhythm for today.`,
  continueToSession: 'Start session',
};
