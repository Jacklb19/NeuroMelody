/** Spanish copy of the home screen (ADR-25). */
export const home = {
  pageTitle: 'Inicio',
  eyebrow: 'Música adaptativa · a tu ritmo',
  introduction:
    'Música generativa que acompaña tus señales fisiológicas. Es una herramienta de bienestar, no un dispositivo médico.',
  prepareSession: 'Preparar una sesión',
  startWithDefaultPlan: (minutes: number): string =>
    `Empezar con el plan por defecto (${String(minutes)} minutos)`,
  /** Shortest to longest allowed plan, e.g. "10–60 minutos". */
  durationRange: (shortest: number, longest: number): string =>
    `${String(shortest)}–${String(longest)} minutos`,
  generativeMusic: 'Música generativa',
  gradualChanges: 'Cambios graduales',
};
