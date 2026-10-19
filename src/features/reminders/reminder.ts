import { MS_PER_SECOND, SECONDS_PER_MINUTE } from '../../shared/time';

/**
 * Session reminder (ADR-33, item 6; ADR-43). A web page cannot ring at a
 * set time on every phone without a server that pushes notifications, so the
 * reminder is reviewed and saved in Google Calendar, with an iCalendar file
 * (RFC 5545) as an alternative for other calendars.
 */

/** Days of the week in calendar order, as iCalendar names them in BYDAY. */
export const WEEKDAY_IDS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

export type WeekdayId = (typeof WEEKDAY_IDS)[number];

export interface Reminder {
  /** Local time as "HH:MM", 24-hour clock. */
  readonly time: string;
  /** Days it repeats on, in calendar order and without repeats. */
  readonly days: readonly WeekdayId[];
}

/** An evening session every day, until the person chooses otherwise. */
export const DEFAULT_REMINDER: Reminder = { time: '21:00', days: WEEKDAY_IDS };

/** Where the choice is kept on the device. */
export const REMINDER_STORAGE_KEY = 'neuromelody.reminder';

/** Length of the calendar event; the alarm sounds when it starts. */
export const REMINDER_EVENT_MINUTES = 15;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
/** iCalendar lines longer than this many octets are folded (RFC 5545, 3.1). */
const MAX_LINE_OCTETS = 75;
const CRLF = '\r\n';
/** Day of `Date.getDay()` (Sunday is 0) of each weekday. */
const JS_DAY: Readonly<Record<WeekdayId, number>> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 };
const DAYS_IN_A_WEEK = 7;
/** Opens a draft in Google's own calendar; the person reviews and saves it there. */
const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/render';

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

/** Chosen days in calendar order, without repeats, so equal choices always look the same. */
export function normalizeDays(days: Iterable<WeekdayId>): WeekdayId[] {
  const chosen = new Set(days);
  return WEEKDAY_IDS.filter((day) => chosen.has(day));
}

/** Reads a stored reminder, validated like any outside input; anything else is the default. */
export function parseReminder(raw: string | null): Reminder {
  if (raw === null) return DEFAULT_REMINDER;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return DEFAULT_REMINDER;
    const { time, days } = value as { time?: unknown; days?: unknown };
    if (!isValidTime(time) || !Array.isArray(days)) return DEFAULT_REMINDER;
    const valid = days.filter((day): day is WeekdayId => WEEKDAY_IDS.some((id) => id === day));
    return { time, days: normalizeDays(valid) };
  } catch {
    return DEFAULT_REMINDER;
  }
}

export interface CalendarText {
  readonly title: string;
  readonly description: string;
  /** Text the alarm shows. */
  readonly alarm: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local date and time in iCalendar's floating form: the event keeps its hour wherever the device is. */
function floating(date: Date): string {
  return `${String(date.getFullYear())}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function utc(date: Date): string {
  return `${String(date.getUTCFullYear())}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

/** A prefilled calendar draft. Notifications are reviewed in Calendar before saving. */
export function buildGoogleCalendarUrl(reminder: Reminder, text: CalendarText, appUrl: string, now: Date, timeZone: string): string {
  const start = firstOccurrence(reminder, now);
  const end = new Date(start.getTime() + REMINDER_EVENT_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND);
  const url = new URL(GOOGLE_CALENDAR_URL);
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', text.title);
  url.searchParams.set('details', `${text.description}\n${appUrl}`);
  url.searchParams.set('dates', `${utc(start)}/${utc(end)}`);
  url.searchParams.set('ctz', timeZone);
  url.searchParams.set('recur', `RRULE:FREQ=WEEKLY;BYDAY=${reminder.days.join(',')}`);
  return url.toString();
}

/** The first moment at or after `now` that falls on a chosen day at the chosen time. */
export function firstOccurrence(reminder: Reminder, now: Date): Date {
  const [hours = 0, minutes = 0] = reminder.time.split(':').map(Number);
  for (let offset = 0; offset <= DAYS_IN_A_WEEK; offset++) {
    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hours, minutes);
    const day = WEEKDAY_IDS.find((id) => JS_DAY[id] === candidate.getDay());
    if (candidate >= now && day !== undefined && reminder.days.includes(day)) return candidate;
  }
  throw new RangeError('A reminder needs at least one day.');
}

/** Escapes text values (RFC 5545, 3.3.11). */
function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds a content line at 75 octets, never inside a UTF-8 character (RFC 5545, 3.1). */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  for (const character of line) {
    // Continuation lines start with a space, which counts towards their length.
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (encoder.encode(current + character).length > limit) {
      parts.push(current);
      current = character;
    } else {
      current += character;
    }
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

/**
 * The reminder as an iCalendar file: one event that repeats weekly on the
 * chosen days, with an alarm when it starts and the link to the app.
 *
 * @param uidDomain Host of the app, so the event identifier is unique to it.
 */
export function buildCalendar(reminder: Reminder, text: CalendarText, appUrl: string, uidDomain: string, now: Date): string {
  const start = firstOccurrence(reminder, now);
  const end = new Date(start.getTime() + REMINDER_EVENT_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NeuroMelody//Reminder//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:session-reminder@${uidDomain}`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${floating(start)}`,
    `DTEND:${floating(end)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${reminder.days.join(',')}`,
    `SUMMARY:${escapeText(text.title)}`,
    `DESCRIPTION:${escapeText(`${text.description}\n${appUrl}`)}`,
    `URL:${appUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(text.alarm)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join(CRLF) + CRLF;
}
