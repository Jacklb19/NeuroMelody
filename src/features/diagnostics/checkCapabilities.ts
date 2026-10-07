import type { EnvironmentCapabilities } from '../diagnostics/diagnostics.types';

/**
 * Checks the browser capabilities required to run worker threads,
 * memory isolation and WebAssembly.
 *
 * @returns Object with the status of each capability in the current environment.
 */
export function checkCapabilities(): EnvironmentCapabilities {
  const hasWindow = typeof window !== 'undefined';

  const crossOriginIsolated = hasWindow
    ? window.crossOriginIsolated
    : false;

  const supportsWorkers = typeof Worker !== 'undefined';

  const supportsWebAssembly =
    typeof WebAssembly === 'object' &&
    typeof WebAssembly.instantiate === 'function';

  const supportsSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  return {
    crossOriginIsolated,
    supportsWorkers,
    supportsWebAssembly,
    supportsSharedArrayBuffer,
  };
}
