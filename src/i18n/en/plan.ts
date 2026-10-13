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
  /** Optional goal (HU-07, ADR-38); `names` and `programs` keys mirror `GoalId`. */
  goals: {
    legend: 'What are you looking for today?',
    hint: 'Optional. Pick one: it changes how the music starts and how far it comes down.',
    /** What the music does in a session with each goal (`programCatalog.ts`). */
    programs: {
      relax: 'The music starts at a middle pace and slowly comes down to its calmest point.',
      rest_before_sleep: 'It starts at a middle pace, comes down to its calmest point and offers slow breathing from the start.',
      calm_after_activity: 'It starts with more movement, close to how you arrive, and comes down with you in two steps.',
      slow_breathing: 'It starts at its calmest point and sets a slow breath.',
      pause: 'It stays at a middle pace, light and steady, without coming all the way down: for a short break.',
    },
    /** The same, for a session with no goal. */
    defaultProgram: 'The music starts at a middle pace and slowly comes down to its calmest point.',
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
  /** Ambience under the music (ADR-40); `names` keys mirror `AmbienceId`. */
  ambience: {
    legend: 'What ambience?',
    hint: 'It plays in the background, under the music. The app remembers your choice on this device.',
    names: { none: 'Music only', rain: 'Rain', sea: 'Sea', wind: 'Wind' },
    /** Line of the session card, with the name of the ambience in lower case. */
    with: (ambience: string): string => `With ${ambience.toLowerCase()} in the background`,
  },
  summaryLabel: 'Your session',
  noGoals: 'No intention chosen',
  calibrationNote: (level: string, minutes: number): string =>
    `The music starts at the ${level} level for the first ${String(minutes)} minutes, while it learns your rhythm for today.`,
  continueToSession: 'Start session',
};
