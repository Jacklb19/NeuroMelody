/** Interface languages (ADR-11, ADR-25, ADR-31). Spanish is the default; the person can switch. */
export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

/** BCP 47 tag of each language, used by Intl formatters and the document. */
export const LOCALE_TAGS: Readonly<Record<Locale, string>> = { es: 'es-CO', en: 'en-US' };
