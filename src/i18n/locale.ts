/** Interface languages; the app ships in Spanish and is ready for more (ADR-11, ADR-25). */
export const LOCALES = ['es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

/** BCP 47 tag of each language, used by Intl formatters and the document. */
export const LOCALE_TAGS: Readonly<Record<Locale, string>> = { es: 'es-CO' };
