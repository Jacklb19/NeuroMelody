import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDER, buildCalendar, firstOccurrence, parseReminder, type Reminder } from './reminder';

const TEXT = { title: 'Sesión, de música; ya', description: 'Línea uno', alarm: 'Es la hora' };
// A Wednesday at 22:10 local time.
const WEDNESDAY_EVENING = new Date(2026, 9, 14, 22, 10);

describe('session reminder', () => {
  it('starts on the next chosen day at the chosen time, today included if it has not passed', () => {
    const weekdays: Reminder = { time: '21:00', days: ['MO', 'TU', 'WE', 'TH', 'FR'] };
    // 21:00 on Wednesday has passed, so the first one is Thursday.
    expect(firstOccurrence(weekdays, WEDNESDAY_EVENING)).toEqual(new Date(2026, 9, 15, 21, 0));
    expect(firstOccurrence({ time: '23:30', days: ['WE'] }, WEDNESDAY_EVENING)).toEqual(new Date(2026, 9, 14, 23, 30));
    // Only Wednesdays, already past: a week later.
    expect(firstOccurrence({ time: '07:00', days: ['WE'] }, WEDNESDAY_EVENING)).toEqual(new Date(2026, 9, 21, 7, 0));
    expect(() => firstOccurrence({ time: '07:00', days: [] }, WEDNESDAY_EVENING)).toThrow(RangeError);
  });

  it('writes a valid weekly event with an alarm, escaped text and CRLF lines', () => {
    const calendar = buildCalendar({ time: '21:00', days: ['MO', 'FR'] }, TEXT, 'https://example.test/app', 'example.test', WEDNESDAY_EVENING);
    const lines = calendar.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    expect(calendar).not.toMatch(/[^\r]\n/);
    expect(lines).toContain('DTSTART:20261016T210000');
    expect(lines).toContain('DTEND:20261016T211500');
    expect(lines).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,FR');
    expect(lines).toContain('SUMMARY:Sesión\\, de música\\; ya');
    expect(lines).toContain('DESCRIPTION:Línea uno\\nhttps://example.test/app');
    expect(lines).toContain('TRIGGER:PT0M');
    expect(lines).toContain('UID:session-reminder@example.test');
  });

  it('folds long lines at 75 octets without splitting a character', () => {
    const long = { ...TEXT, description: 'á'.repeat(60) };
    const calendar = buildCalendar(DEFAULT_REMINDER, long, 'https://example.test/app', 'example.test', WEDNESDAY_EVENING);
    const encoder = new TextEncoder();
    for (const line of calendar.split('\r\n')) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    // Unfolding gives back the whole text.
    expect(calendar.replace(/\r\n /g, '')).toContain(`DESCRIPTION:${'á'.repeat(60)}`);
  });

  it('reads what the device stored, and falls back to the default on anything else', () => {
    expect(parseReminder(JSON.stringify({ time: '07:15', days: ['SU', 'MO', 'MO', 'XX'] }))).toEqual({ time: '07:15', days: ['MO', 'SU'] });
    expect(parseReminder(null)).toBe(DEFAULT_REMINDER);
    expect(parseReminder('{')).toBe(DEFAULT_REMINDER);
    expect(parseReminder(JSON.stringify({ time: '25:00', days: [] }))).toBe(DEFAULT_REMINDER);
  });
});
