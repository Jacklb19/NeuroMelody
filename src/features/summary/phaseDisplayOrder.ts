import type { SignalPhase } from '../records/summarizeSession';

/** Order of the phases in the summary: the reference first, then from the most active to the calmest. */
export const PHASE_DISPLAY_ORDER = ['calibrating', 'high', 'uncertain', 'low'] as const satisfies readonly SignalPhase[];
