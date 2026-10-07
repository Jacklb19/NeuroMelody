import { common } from './common';

/** Button that starts each source; keys mirror `SourceKind`. */
const connect = {
  simulator: 'Conectar simulador',
  recording: 'Reproducir registro',
  ble: 'Conectar banda',
  camera: 'Conectar cámara',
};

/** How to hold the finger over the camera; shared by the camera source and its prototype. */
const cameraInstructions =
  'Cubre la cámara trasera con la yema del dedo, sin apretar, y mantén la mano quieta. Si tu celular lo permite, la linterna se enciende sola. Funciona mejor en Chrome para Android.';

/** Spanish copy of the acquisition area: the signal source panel and the camera prototype (ADR-25). */
export const acquisition = {
  title: 'Fuente de señal',
  sourceLabel: 'Origen de la señal',
  /** Source names; keys mirror `SourceKind`. */
  sources: {
    simulator: 'Simulador',
    recording: 'Registro de ejemplo',
    ble: 'Banda Bluetooth',
    camera: 'Cámara del celular',
  },
  /** Option of a source not yet validated against a strap, e.g. "Cámara del celular (experimental)". */
  experimentalOption: (name: string): string => `${name} (experimental)`,
  connect,
  disconnect: 'Desconectar',
  reconnectRemembered: 'Reconectar banda',

  scenarioLabel: 'Escenario del simulador',
  /** Scenario names; keys mirror `ScenarioId`. Descriptive, never clinical. */
  scenarios: {
    rest: 'Reposo',
    activation: 'Activación',
    progressive_relaxation: 'Relajación progresiva',
    progressive_activation: 'Activación creciente',
    // Describes the device, not the body: the interface does not interpret the signal.
    artifacts: 'Reposo con fallos de lectura',
  },

  recordingLabel: 'Registro',
  /** Recording names; keys mirror `RecordingId`. */
  recordings: {
    nsr001: 'Registro 1',
    nsr002: 'Registro 2',
  },
  /** Recording option, e.g. "Registro 1 · 30 minutos". */
  recordingOption: (name: string, minutes: number): string => `${name} · ${String(minutes)} minutos`,
  recordingNote: 'Datos públicos de ejemplo de PhysioNet nsr2db. La reproducción termina al completar el registro.',
  recordingCredits: 'Origen y licencia de los datos',

  speedLabel: 'Velocidad',
  /** Speed-up option, e.g. "10×". */
  speedOption: (factor: number): string => `${String(factor)}×`,

  bluetoothUnsupported:
    'Este navegador no permite conectar una banda Bluetooth. Usa Chrome o Edge en escritorio o Android; mientras tanto puedes usar el simulador.',
  bleNote: 'Enciende la banda y colócala antes de conectar. Si la conexión se pierde, se intentará recuperar automáticamente.',
  cameraUnsupported:
    'Este navegador no permite usar la cámara como fuente de señal. Usa Chrome en Android; mientras tanto puedes usar el simulador.',
  cameraNote: `${cameraInstructions} La lectura aparece tras unos segundos con el dedo quieto; mantén esta pantalla abierta mientras la uses. Fuente experimental: es menos precisa que una banda de pecho y no es una medida clínica. La imagen se procesa en el dispositivo y no se guarda.`,

  connectionStatus: 'Estado de la conexión:',
  /** Keys mirror `ConnectionState`. */
  connectionStates: {
    disconnected: 'Desconectada',
    connecting: 'Conectando…',
    connected: 'Conectada',
    reconnecting: 'Reconectando…',
    error: 'Error de conexión',
  },

  metrics: {
    heartRate: 'Frecuencia cardíaca',
    receivedBeats: 'Latidos recibidos',
    signalTime: 'Tiempo de señal',
  },

  /** Notice around the reason of a source error, chosen by the selected source. */
  sourceErrors: {
    recording: (reason: string): string => `No se pudo reproducir el registro (${reason}). Intenta conectarlo de nuevo.`,
    ble: (reason: string): string => `No se pudo usar la banda: ${reason}`,
    camera: (reason: string): string => `No se pudo usar la cámara: ${reason}`,
    discarded: (reason: string): string =>
      `La medición no es fiable y se descartó (${reason}). Revisa la colocación del dispositivo.`,
  },
  /** Why the boundary discarded a notification; keys mirror `NotificationIssue`. */
  notificationIssues: {
    invalid_time: 'Tiempo de señal no válido.',
    time_regressed: 'El tiempo de señal retrocedió.',
    heart_rate_out_of_range: (min: number, max: number): string =>
      `Frecuencia cardíaca fuera del rango ${String(min)}–${common.withUnit(String(max), common.units.beatsPerMinute)}.`,
    invalid_rr: 'Intervalo entre latidos no válido.',
  },
  /** Malformed strap notifications; keys mirror `MeasurementErrorCode`. */
  measurementErrors: {
    empty: 'Medición vacía.',
    truncated_heart_rate: 'Medición truncada: falta frecuencia cardíaca.',
    truncated_energy_expended: 'Medición truncada: falta energía gastada.',
    truncated_rr: 'Intervalos RR truncados.',
  },
  /** Strap connection failures; keys mirror `BleFailure`. */
  bleFailures: {
    no_remembered_device: `No hay una banda recordada en este navegador. Usa «${connect.ble}».`,
    no_gatt: 'El dispositivo no ofrece conexión GATT.',
    link_lost: 'Se perdió la conexión con la banda y no se pudo recuperar.',
    permission_denied: 'El navegador no permitió usar Bluetooth.',
    device_unavailable: 'La banda no está disponible. Comprueba que esté encendida y cerca.',
    connect_failed: 'No se pudo conectar con la banda.',
  },
  /** Example recording failures; keys mirror `RecordingErrorCode`. */
  recordingErrors: {
    invalid_format: 'El registro de ejemplo no tiene un formato válido.',
    invalid_series: 'El registro de ejemplo no contiene una serie válida.',
    invalid_interval: 'El registro contiene un intervalo no válido.',
    duration_mismatch: 'La duración del registro no coincide con sus intervalos.',
    load_failed: 'No se pudo cargar el registro de ejemplo.',
  },

  /** Camera pulse prototype in the diagnostics screen (proposal P-01). */
  camera: {
    title: 'Pulso con la cámara (prototipo)',
    instructions: cameraInstructions,
    start: 'Probar con la cámara',
    starting: 'Abriendo la cámara…',
    stop: 'Apagar la cámara',
    statusLabel: 'Estado:',
    statuses: {
      off: 'La cámara está apagada.',
      noFinger: 'Cubre la cámara trasera con la yema del dedo.',
      gathering: 'Dedo detectado: reuniendo latidos…',
      detected: 'Pulso detectado.',
    },
    metrics: {
      pulse: 'Pulso estimado',
      intervals: 'Últimos intervalos',
      framesPerSecond: 'Imágenes por segundo',
      torch: 'Linterna',
    },
    /** Joins the latest intervals, e.g. "812 ms · 798 ms". */
    intervalSeparator: ' · ',
    torch: {
      on: 'Encendida',
      unavailable: 'No disponible: usa buena luz',
    },
    footnote:
      'Prueba para decidir si la cámara sirve como fuente de señal. Es menos precisa que una banda de pecho y no es una medida clínica. La imagen se procesa en el dispositivo y no se guarda.',
    /** Keys mirror `CameraFailure`; the camera source reports the same codes. */
    errors: {
      unsupported: 'Este navegador no permite usar la cámara. Usa Chrome en Android.',
      permission_denied: 'No diste permiso para usar la cámara.',
      not_found: 'No se encontró ninguna cámara.',
      busy: 'Otra aplicación está usando la cámara.',
      open_failed: 'No se pudo abrir la cámara.',
      unreadable: 'No se pudo leer la imagen de la cámara.',
    },
  },
};
