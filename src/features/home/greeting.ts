/** Parts of the day the start screen greets by. */
export const DAY_PARTS = ['morning', 'afternoon', 'evening'] as const;
export type DayPart = (typeof DAY_PARTS)[number];

/** Hour (0–23, device time) at which each part of the day begins; the evening runs until the morning. */
export const MORNING_START_HOUR = 5;
export const AFTERNOON_START_HOUR = 12;
export const EVENING_START_HOUR = 19;

export function dayPartAt(hour: number): DayPart {
  if (hour >= MORNING_START_HOUR && hour < AFTERNOON_START_HOUR) return 'morning';
  if (hour >= AFTERNOON_START_HOUR && hour < EVENING_START_HOUR) return 'afternoon';
  return 'evening';
}

/** First word of a full name, the way a person is greeted; `null` without a name. */
export function firstName(name: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first === undefined || first === '' ? null : first;
}

/** Steps shown before the first session, in order. */
export const FIRST_SESSION_STEP_IDS = ['connect', 'listen', 'rest'] as const;
