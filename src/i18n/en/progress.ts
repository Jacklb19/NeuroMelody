import { common } from './common';

/** "3 of 8 sessions", "1 of 1 session": the sessions something happened in, out of those that could be compared. */
const sessionsOf = (count: number, compared: number): string =>
  `${String(count)} of ${String(compared)} ${compared === 1 ? 'session' : 'sessions'}`;

/**
 * English copy of the progress view (ADR-33). It describes what the figures
 * did across sessions and never says what they mean for the person's health.
 */
export const progress = {
  title: 'Your progress',
  eyebrow: 'Across sessions',
  introduction: 'How the sessions saved on this device have gone, from the oldest to the most recent.',
  loading: 'Loading your sessions…',
  empty: 'No sessions saved yet. Once you finish the first one, you will see how you are doing here.',
  planSession: 'Prepare a session',
  /** Shown with a single session: there is nothing to compare it with yet. */
  single: 'With a single session there is no change to show yet. It will appear from the second one.',
  range: {
    label: 'Sessions shown',
    /** The most recent sessions; the figure comes from the range catalog. */
    last: (count: number): string => `Last ${String(count)}`,
    all: 'All',
  },
  totals: {
    sessions: 'Sessions',
    minutes: 'Minutes listened',
    since: 'Since',
  },
  /** The two lines of every chart. */
  legend: {
    start: 'At the start',
    end: 'At the end',
  },
  /**
   * Keys mirror `ProgressMetricId`. Each insight receives the sessions where
   * the metric moved in its `INSIGHT_DIRECTION` and those that could be compared.
   */
  metrics: {
    heartRate: {
      title: 'Your pulse',
      explanation: 'Beats per minute, on average, at the start and at the end of each session.',
      chartLabel: 'Pulse at the start and at the end of each session, from the oldest to the most recent',
      column: 'Pulse',
      insight: (count: number, compared: number): string =>
        `In ${sessionsOf(count, compared)} your pulse ended lower than it started.`,
    },
    variability: {
      title: 'Variation between heartbeats',
      explanation: 'How much the time between one heartbeat and the next changes. Everyone has their own.',
      chartLabel: 'Variation between heartbeats at the start and at the end of each session, from the oldest to the most recent',
      column: 'Variation between heartbeats',
      insight: (count: number, compared: number): string =>
        `In ${sessionsOf(count, compared)} the variation ended higher than it started.`,
    },
    rating: {
      title: 'How you felt',
      explanation: 'The number you chose before and after listening.',
      chartLabel: 'How you felt before and after each session, from the oldest to the most recent',
      column: 'How you felt',
      insight: (count: number, compared: number): string =>
        `In ${sessionsOf(count, compared)} you chose a higher number at the end than at the start.`,
    },
  },
  /** Instead of the insight when no session has both values of a metric. */
  noComparison: 'No sessions with both values to compare yet.',
  /** Instead of the chart when no session has any value of a metric. */
  noData: 'No data for this chart yet.',
  chart: {
    /** Read by screen readers after the chart's name. */
    keyboardHint: 'Use the left and right arrow keys to move through the sessions.',
  },
  table: {
    summary: 'See the data in a table',
    caption: 'Values at the start and at the end of each session',
    session: 'Session',
  },
  notice: common.nonClinicalIndicators,
};
