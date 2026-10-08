/**
 * Signal-time speed-up factors the person can pick for the simulator and the
 * example recordings (RF-02). The id list is the single source of truth for
 * the `Speed` type and the speed selector.
 */
export const SPEEDS = [1, 2, 5, 10] as const;

export type Speed = (typeof SPEEDS)[number];

/** Real time: what a strap would deliver. */
export const DEFAULT_SPEED: Speed = 1;
