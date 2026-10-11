/**
 * English copy of the public landing page (ADR-25, ADR-28, ADR-30). Written
 * for anyone, without technical terms; descriptive, never clinical: it says
 * what the app does without promising effects.
 */
export const landing = {
  pageTitle: 'Music that follows your rhythm',
  /** Accessible name of the landing navigation. */
  navigationLabel: 'Sections',
  nav: {
    howItWorks: 'How it works',
    moments: 'What it is for',
    privacy: 'Privacy',
    signIn: 'Sign in',
    register: 'Create account',
  },
  hero: {
    eyebrow: 'Music that adapts to you',
    title: 'Music that follows the rhythm of your heart',
    lead:
      'NeuroMelody creates music on the spot and gently adjusts it, little by little, to the rhythm of your heartbeat. A companion in sound for taking a break, breathing and resting.',
    start: 'Start for free',
    howItWorks: 'See how it works',
    note: 'A wellbeing tool. It is not a medical device and does not measure pain.',
    /** Text alternative of the 3D scene. */
    sceneLabel: 'A sphere of particles that beats in time with a simulated heart, surrounded by the five lines of a music staff.',
  },
  /** Live readout of the simulated heart under the hero; never real data. */
  sample: {
    label: 'Simulated example',
    heartRate: 'Pulse',
    rmssd: 'Variation between beats',
    lastBeat: 'Last beat',
  },
  about: {
    eyebrow: 'What it is',
    title: 'Your pulse becomes music',
    body:
      'Made to keep company with people who live with chronic pain, NeuroMelody listens to your heart and composes music that moves along with you. It does not replace your care team: it simply listens and keeps you company.',
    /** Text alternative of the drawing that turns a heartbeat trace into notes on a staff. */
    drawingLabel: 'A heartbeat trace that turns into notes on a music staff.',
    /** Keys mirror `LANDING_HIGHLIGHT_IDS`. */
    highlights: {
      generative: {
        title: 'Different every time',
        text: 'The music is made in the moment, note by note. No two sessions sound the same.',
      },
      listening: {
        title: 'Tuned in to you',
        text: 'It follows the rhythm of your heartbeat while you listen, without judging or drawing conclusions.',
      },
      gradual: {
        title: 'Always gentle',
        text: 'Changes come slowly, with no surprises, so all you have to do is let yourself go.',
      },
    },
  },
  steps: {
    eyebrow: 'How it works',
    title: 'From a heartbeat to a melody',
    intro: 'Everything happens on your device, while you listen.',
    /** Keys mirror `LANDING_STEP_IDS`; the figures come from the app's own constants. */
    items: {
      signal: {
        title: 'Connect your pulse',
        text: 'With a chest strap, with your phone camera or, to try it out, with a sample pulse.',
      },
      analysis: {
        title: 'The app listens to you',
        text: 'It follows every heartbeat and watches how your rhythm changes over the session.',
      },
      state: {
        title: 'It finds your starting point',
        text: (calibrationMinutes: number): string =>
          `During the first ${String(calibrationMinutes)} minutes it learns how you are today, and from there it notices whether you are settling down.`,
      },
      music: {
        title: 'The music keeps you company',
        text: 'The pace and layers of the music ease down or hold steady with you, always gently.',
      },
    },
  },
  moments: {
    eyebrow: 'What it is for',
    title: 'Some time for yourself, whenever you need it',
    /** Keys mirror `GoalId`; the names come from the plan dictionary. */
    descriptions: {
      relax: 'Let go of the tension of the day with music that asks nothing of you.',
      rest_before_sleep: 'Slow down before you go to bed.',
      calm_after_activity: 'Get back to your own pace after moving or after an intense moment.',
      slow_breathing: 'Let the music set the pace for calm breathing.',
      pause: 'Ten minutes with no screens and no to-do list.',
    },
  },
  sources: {
    eyebrow: 'How to measure your pulse',
    title: 'Start with whatever you have at hand',
    experimental: 'In testing',
    /** Keys mirror `SourceKind`; the names come from the acquisition dictionary. */
    descriptions: {
      simulator: 'A sample pulse so you can get to know the app without any equipment.',
      recording: 'Real recorded heartbeats, to see how the music responds.',
      ble: 'The most accurate option: a Bluetooth chest strap.',
      camera: 'Your fingertip on the back camera of your phone.',
    },
  },
  privacy: {
    eyebrow: 'Privacy',
    title: 'Your pulse stays with you',
    /** Keys mirror `LANDING_PRIVACY_IDS`. */
    points: {
      local: 'Your sessions are saved on your device and you can delete them whenever you like.',
      camera: 'The camera image is never saved or sent anywhere.',
      account: 'With your account, nothing is synced without your permission.',
    },
    link: 'Read how we look after your data',
  },
  closing: {
    title: 'Give yourself a few minutes',
    text: (minMinutes: number, maxMinutes: number): string =>
      `Choose a session of ${String(minMinutes)} to ${String(maxMinutes)} minutes and let the music keep you company.`,
    action: 'Create my account',
    secondary: 'I already have an account',
  },
  footer: {
    project: 'Academic project.',
    privacy: 'Privacy',
    notice: 'NeuroMelody is a wellbeing tool. It is not a medical device, it does not measure pain and it is not a substitute for treatment.',
  },
};
