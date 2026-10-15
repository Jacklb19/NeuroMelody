import { useId, useState } from 'react';
import { browserStorage, writePreference } from '../../app/preferences/preferences';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { downloadText } from '../../shared/downloadText';
import { ClockIcon } from '../../shared/icons';
import {
  REMINDER_STORAGE_KEY,
  WEEKDAY_IDS,
  buildCalendar,
  isValidTime,
  normalizeDays,
  parseReminder,
  type Reminder,
  type WeekdayId,
} from './reminder';

/** File name and media type of the calendar file (RFC 5545). */
const CALENDAR_FILE = 'neuromelody-recordatorio.ics';
const CALENDAR_TYPE = 'text/calendar;charset=utf-8';

function storedReminder(): Reminder {
  try {
    return parseReminder(browserStorage()?.getItem(REMINDER_STORAGE_KEY) ?? null);
  } catch {
    return parseReminder(null);
  }
}

/**
 * Session reminder in the profile (ADR-43): the time and the days, kept on
 * the device, and a calendar file that the person's own calendar turns into
 * an alarm. Nothing is sent anywhere.
 */
export function ReminderCard(): React.JSX.Element {
  const t = useMessages();
  const copy = t.reminders;
  const [reminder, setReminder] = useState<Reminder>(storedReminder);
  const ids = { time: useId(), days: useId(), note: useId() };
  const dayNames: Readonly<Record<WeekdayId, { readonly short: string; readonly long: string }>> = copy.days;

  const update = (next: Reminder): void => {
    setReminder(next);
    writePreference(browserStorage(), REMINDER_STORAGE_KEY, JSON.stringify(next));
  };

  const toggleDay = (day: WeekdayId, chosen: boolean): void => {
    update({ ...reminder, days: normalizeDays(chosen ? [...reminder.days, day] : reminder.days.filter((d) => d !== day)) });
  };

  const download = (): void => {
    const appUrl = new URL(ROUTES.app, window.location.origin).toString();
    const calendar = buildCalendar(
      reminder,
      { title: copy.calendar.title, description: copy.calendar.description, alarm: copy.calendar.alarm },
      appUrl,
      window.location.hostname,
      new Date(),
    );
    downloadText(CALENDAR_FILE, calendar, CALENDAR_TYPE);
  };

  const ready = reminder.days.length > 0;
  return (
    <div className="setting-list glass-card reminder-card">
      <div className="setting-row preference-row">
        <span className="icon-badge"><ClockIcon /></span>
        <label className="preference-name" htmlFor={ids.time}>{copy.time}</label>
        <input
          id={ids.time}
          type="time"
          className="reminder-time"
          value={reminder.time}
          required
          onChange={(event) => {
            if (isValidTime(event.target.value)) update({ ...reminder, time: event.target.value });
          }}
        />
      </div>
      <div className="setting-row preference-row">
        <span className="preference-name" id={ids.days}>{copy.daysLabel}</span>
        <div className="segmented reminder-days" role="group" aria-labelledby={ids.days}>
          {WEEKDAY_IDS.map((day) => (
            <label key={day} className="segment">
              <input
                type="checkbox"
                aria-label={dayNames[day].long}
                checked={reminder.days.includes(day)}
                onChange={(event) => { toggleDay(day, event.target.checked); }}
              />
              <span aria-hidden="true">{dayNames[day].short}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="reminder-action">
        <p id={ids.note} className="secondary-text">{ready ? copy.explanation : copy.noDays}</p>
        <button
          type="button"
          className="pill-button pill-button-primary"
          disabled={!ready}
          aria-describedby={ids.note}
          onClick={download}
        >
          {copy.download}
        </button>
      </div>
    </div>
  );
}
