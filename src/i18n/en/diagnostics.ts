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
    introduction: (minutes: number): string => `Compare variants with the same music. Each test lasts at most ${String(minutes)} minutes and fades out on its own.`,
    steps: [
      'Leave everything as it is and start the music, without connecting the camera.',
      'Listen for a few seconds, lock your phone for about 30 seconds, then unlock it. Notice whether you heard cuts.',
      'Stop the test and download the log.',
      'Repeat changing one thing at a time: the alternative output, no reverb, no ambience and the “interactive” latency. Note which ones had cuts.',
    ],
    settings: 'What to compare',
    output: 'Audio output',
    outputs: { direct: 'Current output', media: 'Alternative player output' },
    reverb: 'Reverb',
    reverbs: { on: 'With reverb (as in the session)', off: 'Without reverb' },
    latency: 'Latency asked of the browser',
    latencies: { playback: 'For listening (as in the session)', balanced: 'Balanced', interactive: 'Interactive' },
    preparing: 'Preparing the variant…',
    context: 'Last audio state',
    contextStates: { running: 'Running', suspended: 'Paused', interrupted: 'Interrupted', closed: 'Closed' },
    time: 'Audio clock (seconds)',
    underruns: 'Cuts reported by the browser',
    baseLatency: 'Internal latency (ms)',
    outputLatency: 'Output latency (ms)',
    /** Audio clock against wall clock, as a percentage: 100 % is real time. */
    pace: (percent: string): string => `${percent} %`,
    paceVisible: 'Audio pace with the screen on',
    paceHidden: 'Audio pace with the screen locked',
    slowestHidden: 'Slowest stretch with the screen locked',
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
