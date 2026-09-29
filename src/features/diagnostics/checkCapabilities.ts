import type { EnvironmentCapabilities } from '../diagnostics/diagnostics.types';

/**
 * Evalúa las capacidades del navegador necesarias para la ejecución
 * de hilos de trabajo, aislamiento de memoria y WebAssembly.
 *
 * @returns Objeto con el estado de cada capacidad en el entorno actual.
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
