import { LOCALE_TAGS, type Locale } from './locale';

/** Locale-aware formatting of numbers and dates; text stays in the dictionaries. */
export interface Formatters {
  /** Whole number with the locale's grouping, e.g. "1.234". */
  integer(value: number): string;
  /** Fixed decimals, e.g. "0,40". */
  decimal(value: number, fractionDigits: number): string;
  /** "7 de octubre de 2026, 10:00 a. m." */
  dateTime(iso: string): string;
  /** "7 oct." */
  shortDate(iso: string): string;
}

const cache = new Map<Locale, Formatters>();

function create(locale: Locale): Formatters {
  const tag = LOCALE_TAGS[locale];
  const integer = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 });
  const decimals = new Map<number, Intl.NumberFormat>();
  const dateTime = new Intl.DateTimeFormat(tag, { dateStyle: 'long', timeStyle: 'short' });
  const shortDate = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short' });
  return {
    integer: (value) => integer.format(value),
    decimal: (value, fractionDigits) => {
      let format = decimals.get(fractionDigits);
      if (format === undefined) {
        format = new Intl.NumberFormat(tag, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
        decimals.set(fractionDigits, format);
      }
      return format.format(value);
    },
    dateTime: (iso) => dateTime.format(new Date(iso)),
    shortDate: (iso) => shortDate.format(new Date(iso)),
  };
}

/** Formatters of a locale, created once and reused. */
export function formattersFor(locale: Locale): Formatters {
  let formatters = cache.get(locale);
  if (formatters === undefined) {
    formatters = create(locale);
    cache.set(locale, formatters);
  }
  return formatters;
}
