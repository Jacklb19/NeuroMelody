/** "3 of 8 sessions", "1 of 1 session": the sessions something happened in, out of those that could be compared. */
const sessionsOf = (count: number, compared: number): string =>
  `${String(count)} of ${String(compared)} ${compared === 1 ? 'session' : 'sessions'}`;

const sessions = (count: number): string => `${String(count)} ${count === 1 ? 'session' : 'sessions'}`;

/**
 * English copy of the printable report (ADR-33). The screen around the sheet
 * talks to the person; the sheet itself is read by somebody else, so it
 * names things without "your". It describes figures and concludes nothing.
 */
export const report = {
  pageTitle: 'Report of your sessions',
  eyebrow: 'To share',
  introduction: 'A sheet that sums up your sessions, to print or save as a PDF and take to whoever accompanies you: your therapist, your doctor or someone you trust. It is built from the sessions saved on this device and is not sent anywhere.',
  empty: 'No sessions saved yet. Once you finish the first one, you can prepare your report here.',
  /** Every saved session was made to try the app, so there is nothing of the person to report. */
  onlyTrials: 'The saved sessions were made with the simulator or with a sample recording, which are for trying the app. The report is built from the sessions in which your pulse was measured.',
  /** Sessions left out of the sheet, said on screen only. */
  excluded: (count: number): string =>
    count === 1
      ? 'One trial session (simulator or sample recording) is left out of the report.'
      : `${String(count)} trial sessions (simulator or sample recording) are left out of the report.`,
  print: 'Print or save as PDF',
  printHint: 'Your browser\'s print window opens. For a PDF, choose "Save as PDF" as the printer.',
  /** Title of the printed sheet. */
  sheetTitle: 'Summary of listening sessions',
  preparedOn: (date: string): string => `Prepared on ${date}`,
  /** Dates of the oldest and the most recent session of the sheet. */
  period: (since: string, until: string): string => (since === until ? since : `From ${since} to ${until}`),
  goals: {
    label: 'What they were looking for',
    none: 'No goals chosen',
    /** A goal and the sessions it was chosen in, e.g. "Relax · 4 sessions". */
    count: (name: string, count: number): string => `${name} · ${sessions(count)}`,
  },
  averages: {
    start: 'Average at the start',
    end: 'Average at the end',
  },
  /**
   * Keys mirror `ProgressMetricId`. Every explanation receives the ends of the
   * self-rating scale, which only the rating uses. Each insight receives the
   * sessions where the metric moved in its `INSIGHT_DIRECTION` and those compared.
   */
  metrics: {
    heartRate: {
      title: 'Pulse',
      explanation: (): string => 'Beats per minute, on average, at the start and at the end of each session.',
      insight: (count: number, compared: number): string =>
        `In ${sessionsOf(count, compared)} the pulse ended lower than it started.`,
    },
    variability: {
      title: 'Variation between beats',
      explanation: (): string => 'How much the time between one beat and the next changes (RMSSD). Each person has their own.',
      insight: (count: number, compared: number): string =>
        `In ${sessionsOf(count, compared)} the variation ended higher than it started.`,
    },
    rating: {
      title: 'How they felt',
      explanation: (min: number, max: number): string =>
        `The number the person chose before and after listening, from ${String(min)} (not well at all) to ${String(max)} (very well).`,
      insight: (count: number, compared: number): string =>
        `In ${sessionsOf(count, compared)} they chose a higher number at the end than at the start.`,
    },
  },
  table: {
    title: 'Session by session',
    date: 'Date',
    listened: 'Listened',
    source: 'Measured with',
  },
  notes: {
    title: 'How to read this sheet',
    whatItIs: (appName: string): string =>
      `${appName} is a wellbeing app that adapts music to the listener's pulse. It is not a medical device.`,
    /** How the two values of every session are taken; the seconds come from `EDGE_SECONDS`. */
    edges: (seconds: number): string =>
      `"At the start" and "at the end" are the average of the first and the last ${String(seconds)} seconds with a good signal in each session.`,
  },
};
