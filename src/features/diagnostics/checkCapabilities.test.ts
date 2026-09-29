import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkCapabilities } from './checkCapabilities';

describe('verificarCapacidades', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe retornar un objeto con todas las propiedades requeridas', () => {
    const result = checkCapabilities();

    expect(result).toHaveProperty('crossOriginIsolated');
    expect(result).toHaveProperty('supportsWorkers');
    expect(result).toHaveProperty('supportsWebAssembly');
    expect(result).toHaveProperty('supportsSharedArrayBuffer');
  });

  it('debe reflejar crossOriginIsolated cuando está activo en window', () => {
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
