const minutes = (count: number): string => `${String(count)} ${count === 1 ? 'minute' : 'minutes'}`;

/**
 * English copy of the guided recording (ADR-33). Plain words: it asks for a
 * favour, explains what is kept and promises nothing about the person.
 */
export const collection = {
  pageTitle: 'Help improve the app',
  eyebrow: 'Guided recording',
  /** `total` is the length of the whole protocol, in minutes. */
  introduction: (total: number): string =>
    `The app estimates how you are with a model that learned from other people. With a guided recording of about ${minutes(total)} it can learn from you too. It is optional and changes nothing about your sessions.`,
  minutes,
  steps: {
    title: 'What you will do',
  },
  /** Keys mirror `CollectionStageId`. Every instruction receives the numbers of the counting task, which only that stage uses. */
  stages: {
    rest: {
      name: 'Rest',
      summary: 'Sit in silence, doing nothing.',
      instruction: (): string => 'Sit comfortably, with your back supported. Do not talk or look at your phone: just stay still and breathe as usual.',
      during: 'Stay still and breathe as usual. You do not have to do anything.',
    },
    slow_breathing: {
      name: 'Slow breathing',
      summary: 'Breathe slowly following a circle.',
      instruction: (): string => 'You will breathe slowly following the circle: breathe in as it grows and out as it settles. Without forcing it.',
    },
    demanding_task: {
      name: 'Concentration task',
      summary: 'Subtract in your head as fast as you can.',
      instruction: (start: number, step: number): string =>
        `You will count down from ${String(start)} in steps of ${String(step)}, typing each result as fast as you can. It is hard on purpose: it does not matter if you get some wrong.`,
    },
  },
  consent: {
    title: 'What is kept',
    facts: [
      'The time between one heartbeat and the next, and which stage each one belongs to.',
      'A random code of this device, which does not say who you are. Neither your name nor your email is kept.',
      'Everything stays on this device. It is never sent on its own: you export it and decide whom to give it to.',
      'You can delete each recording whenever you want, right here.',
    ],
    label: 'I agree to this recording being kept on this device so I can export it.',
  },
  begin: 'Start the recording',
  connectFirst: 'First connect below how you will measure your pulse.',
  consentFirst: 'Tick the box to continue.',
  /** Shown with the simulator or a sample recording. */
  demoSource: 'With the simulator or a sample recording you can try how it works, but those heartbeats are not yours and cannot teach the model.',
  stageCount: (current: number, total: number): string => `Stage ${String(current)} of ${String(total)}`,
  startStage: 'Start this stage',
  stopAnytime: 'You can stop whenever you want.',
  cancel: 'Leave it for now',
  /** The signal started over in the middle of a stage. */
  interrupted: 'The signal dropped in the middle of the stage. It has to be recorded again from the start.',
  progressLabel: 'Time of the stage',
  remaining: (clock: string): string => `${clock} left`,
  task: {
    question: (current: number, step: number): string => `What is ${String(current)} minus ${String(step)}?`,
    submit: 'Next',
    hurry: 'As fast as you can.',
    wrong: (current: number): string => `Not that one. Carry on from ${String(current)}.`,
  },
  saved: {
    title: 'Recording saved',
    text: 'Thank you. It is on this device. To be of use it has to be exported and handed to whoever trains the model; the model never changes by itself inside the app.',
    export: 'Export my recordings',
    home: 'Back to the start',
    /** File name, e.g. "neuromelody-recordings-2026-10-12.json". */
    fileName: (prefix: string, date: string): string => `${prefix}-recordings-${date}.json`,
  },
  saveFailed: {
    title: 'It could not be saved',
    text: 'The recording was not saved on this device. You can try again.',
    retry: 'Start over',
  },
  list: {
    title: 'Your recordings',
    about: 'The exported file holds the heartbeats of each stage and the random code of this device. Nothing else.',
    exportAll: (count: number): string => `Export ${String(count)} ${count === 1 ? 'recording' : 'recordings'}`,
    /** Source and size of one recording, e.g. "Bluetooth strap · 742 beats". */
    detail: (source: string, beats: number): string => `${source} · ${String(beats)} beats`,
    delete: 'Delete',
    confirmDelete: 'Yes, delete this recording',
  },
};
