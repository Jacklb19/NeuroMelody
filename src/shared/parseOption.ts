/**
 * Validates a value coming from outside (a URL, a form, storage) against a
 * catalog of allowed options. Unknown values fall back to the catalog's
 * default instead of reaching the app.
 */
export function parseOption<T extends string | number>(options: readonly T[], raw: unknown, fallback: T): T {
  return options.find((option) => String(option) === String(raw)) ?? fallback;
}
