import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkCapabilities } from './checkCapabilities';

describe('checkCapabilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an object with every required property', () => {
    const result = checkCapabilities();

    expect(result).toHaveProperty('crossOriginIsolated');
    expect(result).toHaveProperty('supportsWorkers');
    expect(result).toHaveProperty('supportsWebAssembly');
    expect(result).toHaveProperty('supportsSharedArrayBuffer');
  });

  it('reflects crossOriginIsolated when it is enabled on window', () => {
    const originalValue = window.crossOriginIsolated;
    Object.defineProperty(window, 'crossOriginIsolated', {
      value: true,
      configurable: true,
    });

    const result = checkCapabilities();
    expect(result.crossOriginIsolated).toBe(true);

    Object.defineProperty(window, 'crossOriginIsolated', {
      value: originalValue,
      configurable: true,
    });
  });
});
