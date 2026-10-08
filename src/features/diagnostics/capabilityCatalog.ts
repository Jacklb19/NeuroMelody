import type { EnvironmentCapabilities } from './diagnostics.types';

/**
 * Capabilities listed on the diagnostics screen, in display order. Their
 * names and descriptions live in `t.diagnostics.capabilities`.
 */
export const CAPABILITY_IDS = [
  'crossOriginIsolated',
  'supportsWorkers',
  'supportsWebAssembly',
  'supportsSharedArrayBuffer',
] as const satisfies readonly (keyof EnvironmentCapabilities)[];

export type CapabilityId = (typeof CAPABILITY_IDS)[number];

/** Copy of one capability. */
export interface CapabilityCopy {
  readonly label: string;
  readonly description: string;
}
