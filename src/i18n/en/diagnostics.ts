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
  audio: {
    title: 'Audio test with the screen locked',
    introduction: (minutes: number): string => `Compare two outputs with the same music. The test lasts at most ${String(minutes)} minutes and fades out on its own.`,
    steps: [
      'Choose a sound and ambience, then start the music without connecting the camera.',
      'Listen briefly, lock your phone, then unlock it. Check whether you hear any cuts.',
      'Stop the test and download the log. To compare, repeat with the other output.',
    ],
    settings: 'What to compare',
    output: 'Audio output',
    outputs: { direct: 'Current output', media: 'Alternative player output' },
    context: 'Last audio state',
    contextStates: { running: 'Running', suspended: 'Paused', interrupted: 'Interrupted', closed: 'Closed' },
    time: 'Audio clock (seconds)',
    underruns: 'Cuts reported by the browser',
    baseLatency: 'Internal latency (ms)',
    outputLatency: 'Output latency (ms)',
    entries: 'Log readings',
    unavailable: 'Measurement unavailable',
    directCaveat: 'The counter describes the current output when the browser provides it. Listening to the test is still necessary.',
    mediaCaveat: 'For the alternative output, the counter does not measure the last part of the path to the speaker. Zero here does not prove there were no cuts.',
    download: 'Download audio log',
    privacy: 'The log contains audio states, counters, sound, ambience and browser version. It stays on this device; it contains no heartbeats, images or account data. The test is not saved in your history.',
  },
  recheckHeading: 'Reactivity check',
  checksDone: 'Checks run:',
  recheck: 'Check capabilities again',
};
