/** English copy of the platform diagnostics screen (ADR-25). */
export const diagnostics = {
  pageTitle: 'Platform diagnostics',
  eyebrow: 'Technical tool',
  introduction:
    'Checks the basic setup of the environment, the isolation headers and what the browser supports.',
  capabilitiesHeading: 'Capabilities detected at runtime',
  /** Name and purpose of each checked capability; keys mirror `CapabilityId`. */
  capabilities: {
    crossOriginIsolated: {
      label: 'Cross-origin isolation (crossOriginIsolated)',
      description: 'Shows whether the COOP and COEP headers are active and enable shared memory.',
    },
    supportsWorkers: {
      label: 'Web Workers support',
      description: 'Lets computing tasks run in the background without freezing the interface.',
    },
    supportsWebAssembly: {
      label: 'WebAssembly support',
      description: 'Lets high-performance compiled modules run on the client.',
    },
    supportsSharedArrayBuffer: {
      label: 'SharedArrayBuffer support',
      description: 'Lets threads share memory without structured copies.',
    },
  },
  available: 'Available',
  unavailable: 'Not available',
  recheckHeading: 'Reactivity check',
  checksDone: 'Checks run:',
  recheck: 'Check capabilities again',
};
