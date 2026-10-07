import type { Change } from './summarizeSession';

const DATE_TIME = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' });
const SHORT_DATE = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
const ONE_DECIMAL = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const TWO_DECIMALS = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "7 de octubre de 2026, 10:00 a. m." in the device's time zone. */
export function formatSessionDate(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** "7 oct." for compact lists and chart labels. */
export function formatShortDate(iso: string): string {
  return SHORT_DATE.format(new Date(iso));
}

/** Whole listening minutes; under one minute shows "menos de 1 min". */
export function formatListened(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes < 1 ? 'menos de 1 min' : `${String(minutes)} min`;
}

/** "78 → 68 lpm"; a dash when there is not enough data. */
export function formatChange(change: Change | null, unit: string): string {
  if (change === null) return '—';
  return `${ONE_DECIMAL.format(Math.round(change.start))} → ${ONE_DECIMAL.format(Math.round(change.end))} ${unit}`;
}

/** "4 → 7"; answers that were skipped show as a dash. */
export function formatRatings(before: number | null, after: number | null): string {
  if (before === null && after === null) return 'Sin responder';
  return `${before === null ? '—' : String(before)} → ${after === null ? '—' : String(after)}`;
}

export function formatRatio(value: number | null): string {
  return value === null ? '—' : TWO_DECIMALS.format(value);
}
