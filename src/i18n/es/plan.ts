/** Spanish copy of the session plan screen (ADR-25). */
export const plan = {
  pageTitle: 'Plan de sesión',
  eyebrow: 'Antes de escuchar',
  durationLegend: 'Duración de la sesión',
  /** A duration in words, e.g. "20 minutos": name of each option and the chosen plan. */
  minutes: (minutes: number): string => `${String(minutes)} minutos`,
  /** Unit printed after the figure of each duration option. */
  minutesUnit: 'minutos',
  summaryLabel: 'Resumen del plan',
  /** Sentence around the chosen duration, which is emphasised: "Duración: 20 minutos." */
  chosenDuration: {
    before: 'Duración: ',
    after: '.',
  },
  calibrationNote: (level: string, minutes: number): string =>
    `La música empieza en el nivel ${level} durante los primeros ${String(minutes)} minutos, mientras se toma la referencia de tu señal.`,
  continueToSession: 'Continuar a la sesión',
};
