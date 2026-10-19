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
  explanation: 'Abre Google Calendar con la hora y los días elegidos. Revisa la repetición y el aviso, y pulsa Guardar allí. Cada vez que lo abras será un evento nuevo; para cambiar uno ya guardado, edítalo en tu calendario.',
  noDays: 'Marca al menos un día para crear el recordatorio.',
  openGoogle: 'Abrir Google Calendar',
  download: 'Descargar para otro calendario',
  /** What the calendar event says. */
  calendar: {
    title: 'Sesión de NeuroMelody',
    description: 'Unos minutos de música a tu ritmo. Abre la app:',
    alarm: 'Es la hora de tu sesión de NeuroMelody',
  },
};
