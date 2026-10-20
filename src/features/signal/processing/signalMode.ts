/**
 * What a connection sends (ADR-51): the time between beats, which allows the
 * variability indices, or only the pulse, as many watches do.
 */
export const SIGNAL_MODE_IDS = ['hrv', 'hr_only'] as const;
export type SignalMode = (typeof SIGNAL_MODE_IDS)[number];

export function isSignalMode(value: unknown): value is SignalMode {
  return SIGNAL_MODE_IDS.some((id) => id === value);
}

/**
 * Consecutive notifications with contact and pulse but no intervals after
 * which a connection counts as pulse only. A strap may skip intervals in its
 * first notification or two; a watch never sends them.
 */
export const HR_ONLY_AFTER_NOTIFICATIONS = 5;
