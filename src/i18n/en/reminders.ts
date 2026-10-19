/** English copy of the session reminder in the profile (ADR-43). */
export const reminders = {
  time: 'Time',
  daysLabel: 'Days',
  /** Keys mirror `WeekdayId`: the letter on each button and the full name for screen readers. */
  days: {
    MO: { short: 'Mo', long: 'Monday' },
    TU: { short: 'Tu', long: 'Tuesday' },
    WE: { short: 'We', long: 'Wednesday' },
    TH: { short: 'Th', long: 'Thursday' },
    FR: { short: 'Fr', long: 'Friday' },
    SA: { short: 'Sa', long: 'Saturday' },
    SU: { short: 'Su', long: 'Sunday' },
  },
  explanation: 'Open Google Calendar with your chosen time and days. Review the recurrence and notification, then press Save there. Each opening creates a new draft; to change a saved event, edit it in your calendar.',
  noDays: 'Pick at least one day to create the reminder.',
  openGoogle: 'Open Google Calendar',
  download: 'Download for another calendar',
  /** What the calendar event says. */
  calendar: {
    title: 'NeuroMelody session',
    description: 'A few minutes of music at your pace. Open the app:',
    alarm: 'Time for your NeuroMelody session',
  },
};
