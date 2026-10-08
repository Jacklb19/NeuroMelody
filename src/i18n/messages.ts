import { createContext, useContext } from 'react';
import { es } from './es';
import { formattersFor, type Formatters } from './formatters';
import { DEFAULT_LOCALE, type Locale } from './locale';

/**
 * Every text the person can read lives in a dictionary (ADR-11, ADR-25).
 * Static texts are strings; texts with figures are functions, so TypeScript
 * checks their parameters and numbers are never typed into the copy.
 */
export type Messages = typeof es;

const MESSAGES: Readonly<Record<Locale, Messages>> = { es };

/** Dictionary of a locale, for code outside React (exports, documents). */
export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale];
}

/** Current interface language; a provider can switch it without touching components. */
export const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useMessages(): Messages {
  return messagesFor(useLocale());
}

export function useFormatters(): Formatters {
  return formattersFor(useLocale());
}
