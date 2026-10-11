/** English copy of the adaptation area (ADR-25). */
export const adaptation = {
  /**
   * Accepted estimated states, shared by the session stage, the summary and
   * the CSV export. Keys mirror `ActivationState` plus the calibration phase.
   */
  states: {
    high: 'High',
    low: 'Low',
    uncertain: 'Uncertain',
    calibrating: 'Calibrating: not enough data yet',
  },
  /** Scheduled musical parameters, among the technical details of the session. */
  musicalState: {
    title: 'Musical parameters',
    level: 'Music level',
    currentTempo: 'Current tempo',
    targetTempo: 'Target tempo',
    scheduledMode: 'Scheduled mode',
    scheduledLayers: 'Scheduled layers',
    footnote: 'Changes are gradual. The mode changes when the musical cycle ends.',
  },
};
