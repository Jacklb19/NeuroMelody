import { describe, it, expect } from 'vitest';
import { WARNINGS_STORAGE_KEY, WarningsRegistry, type KeyValueStorage } from './warningsRegistry';

function inMemoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const failingStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('WarningsRegistry', () => {
  it('stores the acceptance date and remembers it on the next visit', () => {
    const storage = inMemoryStorage();
    const registry = new WarningsRegistry(storage);
    expect(registry.isAccepted()).toBe(false);

    expect(registry.accept(new Date('2026-09-29T10:00:00Z'))).toBe(true);
    expect(storage.data.get(WARNINGS_STORAGE_KEY)).toBe('2026-09-29T10:00:00.000Z');
    expect(new WarningsRegistry(storage).isAccepted()).toBe(true);
  });

  it('if storage fails, accepts only for the current visit and asks again afterwards', () => {
    const registry = new WarningsRegistry(failingStorage);
    expect(registry.isAccepted()).toBe(false);
    expect(registry.accept(new Date())).toBe(false);
    expect(registry.isAccepted()).toBe(true);

    expect(new WarningsRegistry(failingStorage).isAccepted()).toBe(false);
  });

  it('works without any storage available', () => {
    const registry = new WarningsRegistry(null);
    expect(registry.isAccepted()).toBe(false);
    expect(registry.accept(new Date())).toBe(false);
    expect(registry.isAccepted()).toBe(true);
  });
});
