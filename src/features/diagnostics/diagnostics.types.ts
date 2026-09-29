/**
 * Representa el conjunto de capacidades web verificadas en tiempo de ejecución.
 */
export interface EnvironmentCapabilities {
  readonly crossOriginIsolated: boolean;
  readonly supportsWorkers: boolean;
  readonly supportsWebAssembly: boolean;
  readonly supportsSharedArrayBuffer: boolean;
}
