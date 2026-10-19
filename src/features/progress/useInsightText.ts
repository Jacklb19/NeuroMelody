import { useLocale, useMessages } from '../../i18n/messages';
import type { AmbienceId } from '../audio/core/ambienceCatalog';
import type { InstrumentId } from '../audio/core/instrumentCatalog';
import { readGoals } from '../plan/goalCatalog';
import { DURATION_BANDS, HOUR_BANDS, type InsightComparison, type InsightDimension } from './historyInsights';

/** All observation text is assembled from already computed figures and translated catalogs. */
export function useInsightText() {
  const t = useMessages();
  const locale = useLocale();
  const number = (value: number): string => new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(value);
  const goals = (key: string): string => readGoals(key).map((goal) => t.plan.goals.names[goal]).join(', ') || t.insights.noGoal;
  const option = (dimension: InsightDimension, value: string): string => {
    switch (dimension) {
      case 'instrument': return t.plan.instrument.names[value as InstrumentId];
      case 'ambience': return t.plan.ambience.names[value as AmbienceId];
      case 'hour': return t.insights.hours[value as (typeof HOUR_BANDS)[number]];
      case 'duration': return t.insights.durations[value as (typeof DURATION_BANDS)[number]['id']];
      case 'plannedDuration': return t.plan.minutes(Number(value));
      case 'goal': return goals(value);
    }
  };
  const scope = (comparison: InsightComparison): string => [
    t.insights.dimensions[comparison.dimension],
    comparison.metric === 'rating' ? t.insights.rating : t.insights.pulse,
    ...(comparison.dimension === 'goal' ? [] : [goals(comparison.goal)]),
    ...(comparison.source === null ? [] : [t.acquisition.sources[comparison.source]]),
    comparison.version === 0 ? t.insights.legacy : t.insights.current,
  ].join(' · ');
  const observation = (comparison: InsightComparison): string => {
    const pair = comparison.pair;
    if (pair === null) return '';
    return t.insights.observation(option(comparison.dimension, pair[0].value), pair[0].count, number(pair[0].median),
      option(comparison.dimension, pair[1].value), pair[1].count, number(pair[1].median));
  };
  return { option, scope, observation, number };
}
