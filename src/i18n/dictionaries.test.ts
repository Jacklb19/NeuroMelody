import { describe, expect, it } from 'vitest';
import { en } from './en';
import { es } from './es';

type Leaf = string | ((...args: never[]) => unknown);
interface Entry {
  readonly path: string;
  readonly es: Leaf;
  readonly en: unknown;
}

/** Every text of the Spanish dictionary next to what the English one has in the same place. */
function entries(spanish: unknown, english: unknown, path = ''): Entry[] {
  if (typeof spanish === 'string' || typeof spanish === 'function') {
    return [{ path, es: spanish as Leaf, en: english }];
  }
  if (typeof spanish !== 'object' || spanish === null) return [];
  return Object.entries(spanish).flatMap(([key, value]) =>
    entries(value, (english as Record<string, unknown> | undefined)?.[key], path === '' ? key : `${path}.${key}`));
}

const ALL = entries(es, en);

/**
 * Texts that read the same in both languages on purpose: units, symbols,
 * names and the examples of what to type. Anything else that is equal is a
 * sentence nobody translated.
 */
const SAME_IN_BOTH = new Set([
  'common.units.milliseconds',
  'common.units.squaredMilliseconds',
  'common.units.minutes',
  'common.units.decibels',
  'common.units.tempo',
  'plan.minutesUnit',
  // "Piano" is the same word.
  'plan.instrument.names.piano',
  // Each language is named in itself, whatever the interface is in.
  'app.settings.language.names.es',
  'app.settings.language.names.en',
  'warnings.keyNames.Escape',
  'acquisition.experimentalOption',
  // Abbreviations of the indicators.
  'records.csv.columns.rmssd',
  'records.csv.columns.sdnn',
  'records.csv.columns.lfHfRatio',
  'history.item.rmssd',
]);

/** Figures and words to call a text function with; most take numbers or short strings. */
const SAMPLE_ARGUMENTS = [3, 7, 11, 13];

function call(text: Leaf): unknown {
  if (typeof text === 'string') return text;
  try {
    return (text as (...args: unknown[]) => unknown)(...SAMPLE_ARGUMENTS);
  } catch {
    // It needs something richer than a figure (a list, an element); its own screen tests cover it.
    return null;
  }
}

describe('English dictionary (ADR-31)', () => {
  it('has a text of the same kind wherever the Spanish one has one', () => {
    const different = ALL.filter((entry) => typeof entry.en !== typeof entry.es).map((entry) => entry.path);
    expect(different).toEqual([]);
  });

  it('leaves no text empty and no sentence in Spanish', () => {
    const untranslated: string[] = [];
    const empty: string[] = [];
    for (const entry of ALL) {
      const spanish = call(entry.es);
      const english = call(entry.en as Leaf);
      if (typeof spanish !== 'string' || typeof english !== 'string') continue;
      if (english.trim() === '') empty.push(entry.path);
      // Equal texts without a single letter (figures, arrows, separators) are not sentences.
      if (english === spanish && /\p{L}/u.test(english) && !SAME_IN_BOTH.has(entry.path)) untranslated.push(entry.path);
      if (/[¿¡ñ]/.test(english) && !SAME_IN_BOTH.has(entry.path)) untranslated.push(entry.path);
    }
    expect(empty).toEqual([]);
    expect(untranslated).toEqual([]);
  });
});
