/** English copy of the history area (ADR-25). */
export const history = {
  title: 'History',
  eyebrow: 'Your sessions',
  introduction: 'Your saved sessions. You can delete them whenever you like.',
  loading: 'Loading your history…',
  empty: 'No saved sessions yet. When you finish a listening session it will show up here, with its summary.',
  planSession: 'Set up a session',
  clearAll: 'Delete all history',
  confirmClearAll: 'Yes, delete all sessions',
  /** Way into the progress view, which shows the evolution across sessions (ADR-33). */
  progress: {
    title: 'See how it has gone',
    text: 'Your pulse and how you felt, session by session.',
    action: 'View your progress',
  },
  item: {
    listenedOf: (listened: string, plannedMinutes: number): string => `${listened} of ${String(plannedMinutes)} min`,
    heartRate: 'Average heart rate',
    rmssd: 'RMSSD',
    viewSummary: 'View summary',
    delete: 'Delete',
    confirmDelete: 'Yes, delete this session',
  },
};
