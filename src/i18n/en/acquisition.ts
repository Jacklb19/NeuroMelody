import { common } from './common';

/** Button that starts each source; keys mirror `SourceKind`. */
const connect = {
  simulator: 'Connect simulator',
  recording: 'Play recording',
  ble: 'Connect strap',
  camera: 'Connect camera',
};

/** The one browser advice for the camera, in every notice that needs it. */
const cameraBrowserAdvice = 'Use Chrome on Android.';

/** The one caveat of the camera, shared by the source and its prototype. */
const cameraCaveat = 'It is less accurate than a chest strap and is not a clinical measurement. The image is processed on the device and is not saved.';

/** How to hold the finger over the camera; shared by the camera source and its prototype. */
const cameraInstructions =
  `Cover the rear camera with your fingertip, without pressing, and keep your hand still. If your phone allows it, the flashlight turns on by itself. ${cameraBrowserAdvice}`;

/** English copy of the acquisition area: the signal source panel and the camera prototype (ADR-25). */
export const acquisition = {
  title: 'Signal source',
  sourceLabel: 'Where the signal comes from',
  /** Source names; keys mirror `SourceKind`. */
  sources: {
    simulator: 'Simulator',
    recording: 'Sample recording',
    ble: 'Bluetooth strap',
    camera: 'Phone camera',
  },
  /** Option of a source not yet validated against a strap, e.g. "Phone camera (experimental)". */
  experimentalOption: (name: string): string => `${name} (experimental)`,
  connect,
  disconnect: 'Disconnect',
  reconnectRemembered: 'Reconnect strap',

  scenarioLabel: 'Simulator scenario',
  /** Scenario names; keys mirror `ScenarioId`. Descriptive, never clinical. */
  scenarios: {
    rest: 'Rest',
    activation: 'Activation',
    progressive_relaxation: 'Gradual relaxation',
    progressive_activation: 'Rising activation',
    // Describes the device, not the body: the interface does not interpret the signal.
    artifacts: 'Rest with reading glitches',
  },

  recordingLabel: 'Recording',
  /** Recording names; keys mirror `RecordingId`. */
  recordings: {
    nsr001: 'Recording 1',
    nsr002: 'Recording 2',
  },
  /** Recording option, e.g. "Recording 1 · 30 minutes". */
  recordingOption: (name: string, minutes: number): string => `${name} · ${String(minutes)} minutes`,
  recordingNote: 'Public sample data from PhysioNet nsr2db. Playback ends when the recording is over.',
  recordingCredits: 'Data source and license',

  speedLabel: 'Speed',
  /** Speed-up option, e.g. "10×". */
  speedOption: (factor: number): string => `${String(factor)}×`,

  bluetoothUnsupported:
    'This browser cannot connect a Bluetooth strap. Use Chrome or Edge on desktop or Android; in the meantime you can use the simulator.',
  bleNote: 'Turn the strap on and put it on before connecting. If the connection drops, the app will try to restore it automatically.',
  cameraUnsupported:
    `This browser cannot use the camera as a signal source. ${cameraBrowserAdvice} In the meantime you can use the simulator.`,
  cameraNote: `${cameraInstructions} The reading appears after a few seconds with your finger still; keep this screen open while you use it. Experimental source. ${cameraCaveat}`,

  connectionStatus: 'Connection status:',
  /** Keys mirror `ConnectionState`. */
  connectionStates: {
    disconnected: 'Disconnected',
    connecting: 'Connecting…',
    connected: 'Connected',
    reconnecting: 'Reconnecting…',
    error: 'Connection error',
  },

  metrics: {
    heartRate: 'Heart rate',
    receivedBeats: 'Beats received',
    signalTime: 'Signal time',
  },

  /** Notice around the reason of a source error, chosen by the kind of error. */
  sourceErrors: {
    recording: (reason: string): string => `The recording could not be played (${reason}). Try connecting it again.`,
    ble: (reason: string): string => `The strap could not be used: ${reason}`,
    camera: (reason: string): string => `The camera could not be used: ${reason}`,
    unexpected: (reason: string): string => `The signal source could not be used (${reason}). Try connecting it again.`,
    discarded: (reason: string): string =>
      `The reading is not reliable and was discarded (${reason}). Check how the device is placed.`,
  },
  /** Reason of a failure the browser reported without a code (a failed download, for example). */
  unexpectedSourceError: 'the browser reported an unexpected problem',
  /** Why the boundary discarded a notification; keys mirror `NotificationIssue`. */
  notificationIssues: {
    invalid_time: 'Invalid signal time.',
    time_regressed: 'The signal time went backwards.',
    heart_rate_out_of_range: (min: number, max: number): string =>
      `Heart rate outside the ${String(min)}–${common.withUnit(String(max), common.units.beatsPerMinute)} range.`,
    invalid_rr: 'Invalid interval between beats.',
  },
  /** Malformed strap notifications; keys mirror `MeasurementErrorCode`. */
  measurementErrors: {
    empty: 'Empty measurement.',
    truncated_heart_rate: 'Truncated measurement: heart rate is missing.',
    truncated_energy_expended: 'Truncated measurement: energy expended is missing.',
    truncated_rr: 'Truncated RR intervals.',
  },
  /** Strap connection failures; keys mirror `BleFailure`. */
  bleFailures: {
    no_remembered_device: `There is no remembered strap in this browser. Use “${connect.ble}”.`,
    no_gatt: 'The device does not offer a GATT connection.',
    link_lost: 'The connection to the strap was lost and could not be restored.',
    permission_denied: 'The browser did not allow the use of Bluetooth.',
    device_unavailable: 'The strap is not available. Check that it is turned on and nearby.',
    connect_failed: 'Could not connect to the strap.',
    attempt_timed_out: 'The strap did not respond in time.',
  },
  /** Example recording failures; keys mirror `RecordingErrorCode`. */
  recordingErrors: {
    invalid_format: 'The sample recording does not have a valid format.',
    invalid_series: 'The sample recording does not contain a valid series.',
    invalid_interval: 'The recording contains an invalid interval.',
    duration_mismatch: 'The length of the recording does not match its intervals.',
    load_failed: 'The sample recording could not be loaded.',
  },

  /** Camera pulse prototype in the diagnostics screen (proposal P-01). */
  camera: {
    title: 'Pulse with the camera (prototype)',
    instructions: cameraInstructions,
    start: 'Try with the camera',
    starting: 'Opening the camera…',
    stop: 'Turn the camera off',
    statusLabel: 'Status:',
    statuses: {
      off: 'The camera is off.',
      noFinger: 'Cover the rear camera with your fingertip.',
      gathering: 'Finger detected: gathering beats…',
      detected: 'Pulse detected.',
    },
    metrics: {
      pulse: 'Estimated pulse',
      intervals: 'Latest intervals',
      framesPerSecond: 'Frames per second',
      torch: 'Flashlight',
    },
    /** Joins the latest intervals, e.g. "812 ms · 798 ms". */
    intervalSeparator: ' · ',
    torch: {
      on: 'On',
      unavailable: 'Not available: use good lighting',
    },
    footnote:
      `A test to decide whether the camera works as a signal source. ${cameraCaveat}`,
    /** Keys mirror `CameraFailure`; the camera source reports the same codes. */
    errors: {
      unsupported: `This browser cannot use the camera. ${cameraBrowserAdvice}`,
      permission_denied: 'You did not give permission to use the camera.',
      not_found: 'No camera was found.',
      busy: 'Another app is using the camera.',
      open_failed: 'The camera could not be opened.',
      unreadable: 'The camera image could not be read.',
    },
  },
};
