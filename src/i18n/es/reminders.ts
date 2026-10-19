/** Spanish copy of the session reminder in the profile (ADR-43). */
export const reminders = {
  time: 'Hora',
  daysLabel: 'Días',
  /** Keys mirror `WeekdayId`: the letter on each button and the full name for screen readers. */
  days: {
    MO: { short: 'L', long: 'Lunes' },
    TU: { short: 'M', long: 'Martes' },
    WE: { short: 'X', long: 'Miércoles' },
    TH: { short: 'J', long: 'Jueves' },
    FR: { short: 'V', long: 'Viernes' },
    SA: { short: 'S', long: 'Sábado' },
    SU: { short: 'D', long: 'Domingo' },
  },
  explanation: 'Tu calendario te avisará: descarga el recordatorio y ábrelo para añadirlo. La app no puede avisarte sola en todos los teléfonos.',
  noDays: 'Marca al menos un día para crear el recordatorio.',
  download: 'Añadir a mi calendario',
  /** What the calendar event says. */
  calendar: {
    title: 'Sesión de NeuroMelody',
    description: 'Unos minutos de música a tu ritmo. Abre la app:',
    alarm: 'Es la hora de tu sesión de NeuroMelody',
  },
};
