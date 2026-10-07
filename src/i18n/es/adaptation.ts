/** Spanish copy of the adaptation area (ADR-25). */
export const adaptation = {
  /**
   * Accepted estimated states, shared by the session stage, the summary and
   * the CSV export. Keys mirror `ActivationState` plus the calibration phase.
   */
  states: {
    high: 'Alta',
    low: 'Baja',
    uncertain: 'Incierta',
    calibrating: 'Calibrando: no hay datos suficientes',
  },
};
