import { useEffect, useId, useState } from 'react';
import type { ConnectionState, SignalSource } from './contract';
import {
  SCENARIOS,
  SCENARIO_IDS,
  type ScenarioId,
} from './simulator/scenarios';
import {
  SimulatedSource,
  SPEEDS,
  type SimulatedSourceOptions,
  type Speed,
} from './simulator/SimulatedSource';
import { useSignalSource } from './useSignalSource';
import { RecordedSource, type RecordedSourceOptions } from './recording/RecordedSource';
import { RECORDING_IDS, type RecordingId } from './recording/recording';
import { BleSource, type BleSourceOptions } from './ble/BleSource';
import { browserBluetooth, type BluetoothAdapter } from './ble/webBluetooth';

/** Fixed seed: the same simulated session repeats on reconnect (RF-02). */
export const SIMULATOR_SEED = 1;

export type CreateSimulatedSource = (options: SimulatedSourceOptions) => SignalSource;
export type CreateBleSource = (options: BleSourceOptions) => SignalSource;

type PanelSourceKind = 'simulator' | 'recording' | 'ble';

const createDefaultSource: CreateSimulatedSource = (options) =>
  new SimulatedSource(options);
const createDefaultRecording = (options: RecordedSourceOptions): SignalSource => new RecordedSource(options);
const createDefaultBle: CreateBleSource = (options) => new BleSource(options);

const CONNECT_TEXT: Readonly<Record<PanelSourceKind, string>> = {
  simulator: 'Conectar simulador',
  recording: 'Reproducir registro',
  ble: 'Conectar banda',
};

function toKind(value: string): PanelSourceKind {
  return value === 'recording' || value === 'ble' ? value : 'simulator';
}

const STATE_TEXT: Readonly<Record<ConnectionState, string>> = {
  disconnected: 'Desconectada',
  connecting: 'Conectando…',
  connected: 'Conectada',
  reconnecting: 'Reconectando…',
  error: 'Error de conexión',
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function toScenario(value: string): ScenarioId {
  return SCENARIO_IDS.find((id) => id === value) ?? 'rest';
}

function toSpeed(value: string): Speed {
  return SPEEDS.find((v) => String(v) === value) ?? 1;
}

interface AcquisitionPanelProps {
  /** Current source; the parent keeps it so it can be shared with the analysis. */
  readonly source: SignalSource | null;
  readonly onSourceChange: (source: SignalSource) => void;
  /** Lets tests inject a fake clock. */
  readonly createSource?: CreateSimulatedSource;
  readonly createRecording?: (options: RecordedSourceOptions) => SignalSource;
  readonly createBle?: CreateBleSource;
  /** Web Bluetooth adapter; `null` when the browser lacks it (RNF-10). */
  readonly bluetooth?: BluetoothAdapter | null;
}

/**
 * Acquisition layer panel: picks the source (simulator, example recording or
 * Bluetooth strap), connects or disconnects, and always shows the connection
 * state (HU-01) with the latest reading received.
 */
export function AcquisitionPanel({
  source,
  onSourceChange,
  createSource = createDefaultSource,
  createRecording = createDefaultRecording,
  createBle = createDefaultBle,
  bluetooth = browserBluetooth(),
}: AcquisitionPanelProps): React.JSX.Element {
  const [kind, setKind] = useState<PanelSourceKind>('simulator');
  const [recordId, setRecordId] = useState<RecordingId>('nsr001');
  const [scenario, setScenario] = useState<ScenarioId>('rest');
  const [speed, setSpeed] = useState<Speed>(1);
  const reading = useSignalSource(source);
  const titleId = useId();

  // Stops the source when it is replaced or the panel unmounts.
  useEffect(
    () => () => {
      void source?.disconnect();
    },
    [source],
  );

  const active = reading.state !== 'disconnected' && reading.state !== 'error';

  const start = (newSource: SignalSource): void => {
    onSourceChange(newSource);
    // Called inside the click handler: Web Bluetooth needs the user gesture.
    void newSource.connect();
  };

  const connect = (): void => {
    if (kind === 'ble') {
      if (bluetooth !== null) start(createBle({ bluetooth, mode: 'choose' }));
      return;
    }
    start(kind === 'simulator'
      ? createSource({ scenario, speed, seed: SIMULATOR_SEED })
      : createRecording({ recordId, speed }));
  };

  const reconnectRemembered = (): void => {
    if (bluetooth !== null) start(createBle({ bluetooth, mode: 'remembered' }));
  };

  const canRemember = kind === 'ble' && bluetooth?.getDevices !== undefined;
  const errorText = reading.error === null ? null
    : kind === 'recording' ? `No se pudo reproducir el registro (${reading.error}). Intenta conectarlo de nuevo.`
      : kind === 'ble' && reading.state === 'error' ? `No se pudo usar la banda: ${reading.error}`
        : `La medición no es fiable y se descartó (${reading.error}). Revisa la colocación del dispositivo.`;

  const disconnect = (): void => {
    void source?.disconnect();
  };

  return (
    <section
      aria-labelledby={titleId}
      className="acquisition-panel"
    >
      <h2 id={titleId}>
        Fuente de señal
      </h2>

      <div className="source-controls">
        <label>
          Origen de la señal
          <select value={kind} disabled={active} onChange={event => {
            setKind(toKind(event.target.value));
          }}>
            <option value="simulator">Simulador</option>
            <option value="recording">Registro de ejemplo</option>
            <option value="ble" disabled={bluetooth === null}>Banda Bluetooth</option>
          </select>
        </label>
        {kind === 'ble' ? null : kind === 'simulator' ? <label>
          Escenario del simulador
          <select
            value={scenario}
            disabled={active}
            onChange={(event) => {
              setScenario(toScenario(event.target.value));
            }}
          >
            {SCENARIO_IDS.map((id) => (
              <option key={id} value={id}>
                {SCENARIOS[id].name}
              </option>
            ))}
          </select>
        </label> : <label>
          Registro
          <select value={recordId} disabled={active} onChange={event => {
            setRecordId(RECORDING_IDS.find(id => id === event.target.value) ?? 'nsr001');
          }}>
            {RECORDING_IDS.map((id, index) => <option key={id} value={id}>
              Registro {index + 1} · 30 minutos
            </option>)}
          </select>
        </label>}

        {kind !== 'ble' && <label>
          Velocidad
          <select
            value={speed}
            disabled={active}
            onChange={(event) => {
              setSpeed(toSpeed(event.target.value));
            }}
          >
            {SPEEDS.map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
        </label>}
      </div>
      {kind === 'recording' && <p className="recording-note">
        Datos públicos de ejemplo de PhysioNet nsr2db. La reproducción termina al completar el registro.{' '}
        <a href="/recordings/CREDITS.md">Origen y licencia de los datos</a>
      </p>}
      {bluetooth === null && <p className="recording-note">
        Este navegador no permite conectar una banda Bluetooth. Usa Chrome o Edge en escritorio o Android; mientras tanto puedes usar el simulador.
      </p>}
      {kind === 'ble' && <p className="recording-note">
        Enciende la banda y colócala antes de conectar. Si la conexión se pierde, se intentará recuperar automáticamente.
      </p>}

      <div className="action-row source-button">
        <button
          type="button"
          className="button button-secondary"
          onClick={active ? disconnect : connect}
        >
          {active ? 'Desconectar' : CONNECT_TEXT[kind]}
        </button>
        {canRemember && !active && <button type="button" className="button button-secondary" onClick={reconnectRemembered}>
          Reconectar banda
        </button>}
      </div>

      <p role="status" className="connection-status" data-state={reading.state}>
        Estado de la conexión: <strong>{STATE_TEXT[reading.state]}</strong>
      </p>

      {errorText !== null && (
        <p role="alert" className="quiet-notice">{errorText}</p>
      )}

      <dl className="source-metrics">
        <dt>Frecuencia cardíaca</dt>
        <dd data-testid="heart-rate">
          {reading.last === null ? '—' : `${String(reading.last.heartRate)} lpm`}
        </dd>
        <dt>Latidos recibidos</dt>
        <dd data-testid="received-beats">{reading.receivedBeats}</dd>
        <dt>Tiempo de señal</dt>
        <dd data-testid="signal-time">
          {reading.last === null ? '—' : formatTime(reading.last.timeMs)}
        </dd>
      </dl>
    </section>
  );
}
