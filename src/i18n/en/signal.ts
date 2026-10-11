/** English copy of the signal area (ADR-25). Always descriptive, never clinical. */
export const signal = {
  title: 'Signal and indicators',
  qualityLabel: 'Signal quality:',
  waitingForData: 'Waiting for signal data',
  /** Signal quality as the person reads it; keys mirror `SignalQuality`. */
  quality: {
    collecting: 'Gathering data…',
    good: 'Good',
    low: 'Low: check how the device is positioned.',
  },
  threadUnavailable: 'Signal analysis is not available in this browser.',
  /** `reason` is one of `errors` or `workerCrashed`. */
  threadFailed: (reason: string): string => `The signal analysis could not be updated (${reason}).`,
  workerCrashed: 'the analysis thread stopped unexpectedly',
  /** Keys mirror `SignalThreadErrorCode`. */
  errors: {
    unrecognized_message: 'Message not recognized by the signal thread.',
    no_2d_context: 'The 2D context of the canvas could not be obtained.',
    unreadable_message: 'A message from the signal thread could not be read.',
    unrecognized_response: 'Unrecognized response from the signal thread.',
  },
  chart: {
    /** Accessible name of the tachogram; `minutes` is the analysis window. */
    accessibleName: (minutes: number): string =>
      `Tachogram: intervals between heartbeats over the last ${String(minutes)} minutes`,
    unavailable: (reason: string): string =>
      `The chart is not available: ${reason}. The text indicators keep updating.`,
    noOffscreenCanvas: 'This browser cannot draw the chart in the background',
    stylesMissing: (detail: string): string => `Chart styles are missing (${detail})`,
    /** Keys mirror `ChartPaletteErrorCode`; the parameter is the CSS variable or value at fault. */
    paletteErrors: {
      missing_variable: (variable: string): string => `The CSS variable ${variable} is missing.`,
      invalid_font_size: (value: string): string => `Invalid font size: ${value}.`,
      invalid_length: (variable: string): string => `The CSS variable ${variable} is not a positive length in px or rem.`,
    },
  },
  /** Labels of the indicators, reusable wherever the same figures are shown. */
  metrics: {
    meanHr: 'Mean heart rate',
    rmssd: 'Beat-to-beat variability (RMSSD)',
    sdnn: 'Overall variability (SDNN)',
    lfPower: 'Slow oscillation (LF power)',
    hfPower: 'Fast oscillation (HF power)',
    lfHfRatio: 'LF/HF ratio',
    analysisWindow: 'Analyzed window',
    acceptedBeats: 'Accepted beats',
    discardedBeats: 'Discarded due to signal quality',
  },
  /** Covered part of the analysis window, e.g. "0:30 of 5:00". */
  windowCoverage: (covered: string, total: string): string => `${covered} of ${total}`,
  /** Why LF/HF is still missing; `duration` is the continuous signal the spectrum needs, with its unit. */
  spectrumCollecting: (duration: string): string => `Gathering ${duration} of continuous signal`,
};
