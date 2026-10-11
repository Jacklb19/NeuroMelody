/** Spanish copy shared by every screen: units, placeholders and generic messages. */
export const common = {
  /** Shown instead of a figure that cannot be computed yet. */
  noValue: '—',
  units: {
    beatsPerMinute: 'lpm',
    milliseconds: 'ms',
    squaredMilliseconds: 'ms²',
    minutes: 'min',
    decibels: 'dB',
    tempo: 'BPM',
  },
  /** Value with its unit, e.g. "62 lpm". */
  withUnit: (value: string, unit: string): string => `${value} ${unit}`,
  unknownError: 'Error desconocido.',
  /** The one non-clinical notice about the indicators, wherever they are shown or exported. */
  nonClinicalIndicators: 'Son indicadores descriptivos de tu señal: no miden el dolor ni son una valoración clínica.',
  /** The one notice about the provisional state estimator (R-05, ADR-14). */
  provisionalEstimate: 'Confianza no calibrada · reglas provisionales',
  optional: '(opcional)',
  cancel: 'Cancelar',
};
