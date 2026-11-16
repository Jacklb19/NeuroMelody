import type { LevelId } from '../audio/engine/levels';

/**
 * Choices of the listening screen (P-17). The dictionary words them and
 * index.css holds their look.
 */

/** How long a piece plays before its quiet ending, in minutes. Never past the 60 of ADR-16. */
export const LISTEN_DURATIONS_MIN = [15, 30, 45, 60] as const;

export type ListenDurationMin = (typeof LISTEN_DURATIONS_MIN)[number];

export const DEFAULT_LISTEN_DURATION_MIN: ListenDurationMin = 30;

/** The steps a piece can stay at, from the liveliest to the one for falling asleep (ADR-41). */
export const LISTEN_LEVELS = ['high', 'intermediate', 'target', 'sleep'] as const satisfies readonly LevelId[];

/** The calmest step every session reaches: where listening starts unless the person picks another. */
export const DEFAULT_LISTEN_LEVEL: LevelId = 'target';

/** Tabs of the screen, in order: what will sound, and what was kept. */
export const LISTEN_TABS = ['create', 'melodies'] as const;

export type ListenTab = (typeof LISTEN_TABS)[number];

/** The tab a link asks for; anything else is the first one. */
export function readListenTab(value: string | null): ListenTab {
  return LISTEN_TABS.find((tab) => tab === value) ?? 'create';
}
