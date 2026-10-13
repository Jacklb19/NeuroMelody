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
  question: 'What do you need right now?',
  start: {
    eyebrow: 'New session',
    title: 'Set up your session in three steps',
    text: 'Choose what you are after, how long you have and which ambience. The music starts from your pulse and keeps you company from there.',
    action: 'Set up my session',
    /** Starts a session like the last one: same goal and length, and the ambience kept on the device. */
    repeat: 'Repeat the last one',
  },
  goals: {
    title: 'Or start from what you are after',
    hint: 'Each intention changes how the music starts and how far it comes down.',
    /** What the music does with each goal, in a few words; keys mirror `GoalId`. */
    taglines: {
      relax: 'From a middle pace down to calm',
      rest_before_sleep: 'Comes down to its slowest and fades out by itself',
      calm_after_activity: 'Starts lively and comes down with you',
      slow_breathing: 'Calm from the start, with guided breathing',
      pause: 'Light and steady, for a short while',
    },
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
