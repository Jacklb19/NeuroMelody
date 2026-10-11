import { describe, expect, it } from 'vitest';
import { LOCALE_STORAGE_KEY, readLocale, readThemePreference, resolveTheme, THEME_STORAGE_KEY } from './preferences';

const storageWith = (values: Record<string, string>) => ({
  getItem: (key: string) => values[key] ?? null,
  setItem: () => undefined,
});

describe('preferences', () => {
  it('follows the system unless the person chose a theme', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('ignores stored values that are not valid options', () => {
    const storage = storageWith({ [THEME_STORAGE_KEY]: 'neon', [LOCALE_STORAGE_KEY]: 'fr' });
    expect(readThemePreference(storage)).toBe('system');
    expect(readLocale(storage)).toBe('es');
    expect(readLocale(storageWith({ [LOCALE_STORAGE_KEY]: 'en' }))).toBe('en');
  });
});
