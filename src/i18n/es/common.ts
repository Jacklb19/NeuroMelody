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
  optional: '(opcional)',
  cancel: 'Cancelar',
};
