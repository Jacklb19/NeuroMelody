/** English copy of the history area (ADR-25). */
export const history = {
  title: 'History',
  eyebrow: 'Your sessions',
  introduction: 'Sessions are saved only on this device. You can delete them whenever you like.',
  loading: 'Loading your history…',
  empty: 'No saved sessions yet. When you finish a listening session it will show up here, with its summary.',
  planSession: 'Set up a session',
  clearAll: 'Delete all history',
  confirmClearAll: 'Yes, delete all sessions',
  evolution: {
    title: 'Changes across sessions',
    rmssdLabel: 'Variation between heartbeats at the end of each session, from oldest to most recent',
    rmssdCaption: 'Variation between heartbeats at the end of each session',
    ratingLabel: 'How you felt at the end of each session, from oldest to most recent',
    ratingCaption: 'How you felt at the end',
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
