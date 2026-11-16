import { useLocale, useMessages } from '../../i18n/messages';
import type { AmbienceId } from '../audio/core/ambienceCatalog';
import type { InstrumentId } from '../audio/core/instrumentCatalog';
import { readGoals } from '../plan/goalCatalog';
import { DURATION_BANDS, HOUR_BANDS, type InsightComparison, type InsightDimension } from './historyInsights';

/** One observation told in plain words; every sentence comes from the dictionary and the computed figures. */
export interface InsightReading {
  readonly lead: string;
  readonly size: string;
  readonly support: string;
  readonly next: string;
}

/** Below the first value a difference is small, below the second moderate, otherwise clear (rating points, beats per minute). */
const READING_THRESHOLDS = { rating: [1, 2], pulse: [3, 6] } as const;
/** The fewer sessions of the two options: below these the comparison is only a hint, then a trend to watch. */
const FEW_SESSIONS = 8;
const STEADY_SESSIONS = 15;

/** All observation text is assembled from already computed figures and translated catalogs. */
export function useInsightText() {
  const t = useMessages();
  const locale = useLocale();
  const number = (value: number): string => new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(value);
  const plain = (value: number): string => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
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
  /**
   * The observation read in plain words (ADR-48): which option went with the better result, how large the
   * difference is, how much the number of sessions supports it, and what to try next. Built only from the figures
   * computed on the device; nothing here comes from the language model.
   */
  const reading = (comparison: InsightComparison): InsightReading | null => {
    const pair = comparison.pair;
    if (pair === null) return null;
    const [better, other] = pair;
    const copy = t.insights.reading;
    const metric = comparison.metric;
    const change = (value: number): string => (metric === 'rating' ? copy.ratingChange : copy.pulseChange)(Math.sign(value), plain(Math.abs(value)));
    const gap = Math.abs(better.median - other.median);
    const [small, clear] = READING_THRESHOLDS[metric];
    const size = gap < small ? 'small' : gap < clear ? 'moderate' : 'clear';
    const fewest = Math.min(better.count, other.count);
    const support = fewest < FEW_SESSIONS ? 'few' : fewest < STEADY_SESSIONS ? 'some' : 'many';
    const betterName = option(comparison.dimension, better.value);
    const otherName = option(comparison.dimension, other.value);
    return {
      lead: copy.lead(t.insights.dimensions[comparison.dimension], betterName, change(better.median), otherName, change(other.median)),
      size: copy.size[size](plain(gap), metric === 'rating' ? copy.points(gap) : copy.beats),
      support: copy.support[support](better.count, other.count),
      // A small difference names no winner: either option is worth keeping.
      next: size === 'small' ? copy.nextEither(betterName, otherName)
        : comparison.dimension === 'goal' ? copy.nextGoal(betterName) : copy.next(betterName, goals(comparison.goal)),
    };
  };
  return { option, scope, observation, number, goals, reading };
}
