/**
 * Estimated states the adaptation can accept (ADR-12). The id list is the
 * single source of truth for the type, stored sessions and their labels.
 */
export const ACTIVATION_STATE_IDS = ['high', 'low', 'uncertain'] as const;

export type ActivationState = (typeof ACTIVATION_STATE_IDS)[number];
