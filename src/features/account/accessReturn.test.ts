import { describe, expect, it } from 'vitest';
import { planPath, ROUTES } from '../../config/routes';
import {
  ACCESS_RETURN_STORAGE_KEY,
  ACCESS_RETURN_TTL_MS,
  accessReturnPath,
  accessReturnState,
  forgetAccessReturn,
  rememberAccessReturn,
  rememberedAccessReturn,
  safeReturnPath,
} from './accessReturn';

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value); },
    removeItem: (key) => { items.delete(key); },
  };
}

describe('safeReturnPath', () => {
  it('keeps a screen of the app with its query', () => {
    expect(safeReturnPath(planPath(['relax'], 30))).toBe('/plan?goals=relax&duration=30');
    expect(safeReturnPath('/summary/abc')).toBe('/summary/abc');
  });

  it.each([
    'https://evil.example/plan',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'plan',
    ROUTES.home,
    ROUTES.login,
    `${ROUTES.register}?x=1`,
    ROUTES.resetPassword,
    42,
    null,
  ])('refuses %j', (value) => {
    expect(safeReturnPath(value)).toBeNull();
  });
});

describe('accessReturnPath', () => {
  it('returns to the screen kept in the navigation state', () => {
    expect(accessReturnPath(accessReturnState('/progress'))).toBe('/progress');
  });

  it.each([undefined, null, {}, { from: 7 }, { from: '//evil.example' }])('falls back to the app for %j', (state) => {
    expect(accessReturnPath(state)).toBe(ROUTES.app);
  });
});

describe('return kept across the Google redirect', () => {
  it('is read while fresh, then forgotten', () => {
    const storage = memoryStorage();
    rememberAccessReturn('/progress', 1_000, storage);
    expect(rememberedAccessReturn(1_000 + ACCESS_RETURN_TTL_MS, storage)).toBe('/progress');
    expect(rememberedAccessReturn(1_001 + ACCESS_RETURN_TTL_MS, storage)).toBeNull();
    forgetAccessReturn(storage);
    expect(storage.getItem(ACCESS_RETURN_STORAGE_KEY)).toBeNull();
  });

  it('keeps nothing for the app start or an unsafe path, and ignores tampered values', () => {
    const storage = memoryStorage();
    rememberAccessReturn(ROUTES.app, 1_000, storage);
    expect(storage.getItem(ACCESS_RETURN_STORAGE_KEY)).toBeNull();
    rememberAccessReturn('//evil.example', 1_000, storage);
    expect(storage.getItem(ACCESS_RETURN_STORAGE_KEY)).toBeNull();
    storage.setItem(ACCESS_RETURN_STORAGE_KEY, JSON.stringify({ path: 'https://evil.example', at: 1_000 }));
    expect(rememberedAccessReturn(1_000, storage)).toBeNull();
    storage.setItem(ACCESS_RETURN_STORAGE_KEY, '{not json');
    expect(rememberedAccessReturn(1_000, storage)).toBeNull();
  });
});
