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
  /** Scheduled musical parameters, among the technical details of the session. */
  musicalState: {
    title: 'Parámetros musicales',
    level: 'Escalón musical',
    currentTempo: 'Tempo actual',
    targetTempo: 'Tempo de destino',
    scheduledMode: 'Modo programado',
    scheduledLayers: 'Capas programadas',
    footnote: 'Los cambios son graduales. El modo cambia al cerrar el ciclo musical.',
  },
};
