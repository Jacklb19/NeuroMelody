/** English copy of the session plan screen (ADR-25, ADR-30). */
export const plan = {
  pageTitle: 'Set up your session',
  eyebrow: 'Before you listen',
  introduction: 'Choose your intention, the time and how you want it to sound. You can change it next time.',
  durationLegend: 'How much time do you have?',
  /** A duration in words, e.g. "20 minutes": name of each option and the chosen plan. */
  minutes: (minutes: number): string => `${String(minutes)} minutes`,
  /** Unit printed under the figure of each duration option. */
  minutesUnit: 'min',
  /** Optional goal (HU-07, ADR-38); `names` and `programs` keys mirror `GoalId`. */
  goals: {
    legend: 'What is your intention today?',
    hint: 'Optional. Pick one: it changes how the music starts and how far it comes down.',
    /** What the music does in a session with each goal (`programCatalog.ts`). */
    programs: {
      relax: 'The music starts at a middle pace and slowly comes down to its calmest point.',
      rest_before_sleep: 'It starts at a middle pace and comes down slower and darker than any other, with slow breathing. At the end it fades out by itself, with no notices, and the screen dims.',
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
  /** Plan composed by the language model from what the person writes (ADR-68); the person decides. */
  compose: {
    question: 'How are you feeling today, or what would you like to hear?',
    placeholder: 'For example: I am studying and want something calm for about 30 minutes',
    send: 'Send',
    working: 'Putting your plan together…',
    /** Shown only near the limit. */
    remaining: (count: number): string => (count === 1 ? '1 character left' : `${String(count)} characters left`),
    resultTitle: 'Your plan',
    generatedMark: 'Automatic proposal',
    noGoal: 'No intention',
    modes: { adaptive: 'Follows your pulse', fixed: 'Fixed music' },
    use: 'Use this setup and start the session',
    dismiss: 'No, thanks',
    /** `reason` is one of the cloud error sentences. */
    failed: (reason: string): string => `I could not put the plan together: ${reason} You can choose it below.`,
  },
  /** Sound worlds (ADR-64); `names` and `descriptions` keys mirror `WorldId`. */
  worlds: {
    legend: 'Which sound world?',
    hint: 'Each world brings a sound, an ambience and a texture together, and gives the listening its own colour. You can still set them yourself below.',
    names: {
      misty_forest: 'Misty forest',
      night_coast: 'Night coast',
      city_rain: 'Rain in the city',
      high_moor: 'High moor at dawn',
      deep_space: 'Deep space',
      quiet_room: 'Quiet room',
    },
    descriptions: {
      misty_forest: 'Bowls that ring long, with wind through the trees.',
      night_coast: 'A warm sound over the sway of the sea.',
      city_rain: 'A calm piano with rain on the window.',
      high_moor: 'Few notes and open wind, with plenty of air.',
      deep_space: 'A warm, enveloping sound with nothing behind it.',
      quiet_room: 'Just a piano, close and plain.',
    },
    /** Shown when the choices below match no world. */
    custom: 'Your combination is none of the worlds: it is your own.',
    /** Line of the session card and of the session heading. */
    chosen: (world: string): string => `World: ${world}`,
  },
  /** Instrument of the music (ADR-46); `names` keys mirror `InstrumentId`. */
  instrument: {
    legend: 'Which sound?',
    hint: 'The same notes, played with another instrument. The app remembers your choice on this device.',
    names: { warm: 'Warm', piano: 'Piano', bowls: 'Bowls' },
    /** Line of the session card. */
    chosen: (instrument: string): string => `Sound: ${instrument}`,
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
    `For the first ${String(minutes)} minutes the music stays ${level.toLocaleLowerCase('en')} while it learns your rhythm for today. Then it adapts to you.`,
  continueToSession: 'Start session',
};
