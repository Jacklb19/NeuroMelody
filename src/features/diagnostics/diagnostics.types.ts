/**
 * Set of web capabilities checked at runtime.
 */
export interface EnvironmentCapabilities {
  readonly crossOriginIsolated: boolean;
  readonly supportsWorkers: boolean;
  readonly supportsWebAssembly: boolean;
  readonly supportsSharedArrayBuffer: boolean;
}
