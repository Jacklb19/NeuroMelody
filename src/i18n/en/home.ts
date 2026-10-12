/** English copy of the app's start screen (ADR-25, ADR-30). */
export const home = {
  pageTitle: 'Home',
  /** Keys mirror `DayPart`. */
  greetings: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  },
  /** Greeting for someone whose name is known, e.g. "Good afternoon, Ana". */
  greetingWithName: (greeting: string, name: string): string => `${greeting}, ${name}`,
  question: 'What would feel good right now?',
  start: {
    eyebrow: 'Your next session',
    title: (minutes: number): string => `${String(minutes)} minutes of music at your pace`,
    text: 'Get comfortable, connect your pulse and let the music keep you company.',
    action: 'Start now',
    customize: 'Customize session',
  },
  goals: {
    title: 'Start with an intention',
    hint: 'Pick one and set the length to your liking.',
  },
  activity: {
    title: 'Your activity',
    sessions: 'Sessions',
    minutes: 'Minutes listened',
    seeHistory: 'View history',
    seeProgress: 'View your progress',
  },
  last: {
    title: 'Your last session',
    /** Listening time and goals of the last session on one line. */
    detail: (listened: string, goals: string): string => `${listened} · ${goals}`,
    view: 'View summary',
  },
  /** Shown instead of the activity until there is a first session; keys mirror `FIRST_SESSION_STEP_IDS`. */
  first: {
    title: 'Your first session, in three steps',
    steps: {
      connect: { title: 'Connect your pulse', text: 'With a chest strap, with the camera or with a sample pulse.' },
      listen: { title: 'Start the music', text: 'It begins gently while it learns your rhythm for today.' },
      rest: { title: 'Let yourself go', text: 'There is nothing else you need to do.' },
    },
  },
  notice: 'A wellbeing tool. It is not a medical device and does not measure pain.',
};
