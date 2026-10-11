/** English copy shared by every screen: units, placeholders and generic messages. */
export const common = {
  /** Shown instead of a figure that cannot be computed yet. */
  noValue: '—',
  units: {
    beatsPerMinute: 'bpm',
    milliseconds: 'ms',
    squaredMilliseconds: 'ms²',
    minutes: 'min',
    decibels: 'dB',
    tempo: 'BPM',
  },
  /** Value with its unit, e.g. "62 bpm". */
  withUnit: (value: string, unit: string): string => `${value} ${unit}`,
  unknownError: 'Unknown error.',
  /** The one non-clinical notice about the indicators, wherever they are shown or exported. */
  nonClinicalIndicators: 'These indicators describe your signal: they do not measure pain and are not a clinical assessment.',
  /** The one notice about the provisional state estimator (R-05, ADR-14). */
  provisionalEstimate: 'Uncalibrated confidence · provisional rules',
  optional: '(optional)',
  cancel: 'Cancel',
};
