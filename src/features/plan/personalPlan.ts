import type { AmbienceId } from '../audio/core/ambienceCatalog';
import type { InstrumentId } from '../audio/core/instrumentCatalog';
import type { InsightComparison } from '../progress/historyInsights';
import { DURATIONS_MIN, type DurationMin } from './plan';

export interface PersonalChoices {
  readonly instrument?: InstrumentId;
  readonly ambience?: AmbienceId;
  readonly duration?: DurationMin;
}

/** An explicit link wins even when the person accepts a history suggestion. */
export function personalChoices(comparisons: readonly InsightComparison[], linked: { instrument: boolean; ambience: boolean; duration: boolean }): PersonalChoices {
  const choices: { instrument?: InstrumentId; ambience?: AmbienceId; duration?: DurationMin } = {};
  for (const comparison of comparisons) {
    const value = comparison.pair?.[0].value;
    if (value === undefined) continue;
    if (comparison.dimension === 'instrument' && !linked.instrument) choices.instrument = value as InstrumentId;
    if (comparison.dimension === 'ambience' && !linked.ambience) choices.ambience = value as AmbienceId;
    if (comparison.dimension === 'plannedDuration' && !linked.duration) {
      choices.duration = DURATIONS_MIN.find((minutes) => String(minutes) === value);
    }
  }
  return choices;
}
