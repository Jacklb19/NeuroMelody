import { useEffect, useId, useState } from 'react';
import { useMessages } from '../../i18n/messages';
import { formatClock } from '../../shared/formatClock';
import { parseOption } from '../../shared/parseOption';
import type { ConnectionState, SignalSource } from './contract';
import { SIMULATOR_SEED } from './config';
import { describeSourceError } from './describeSourceError';
import { DEFAULT_SCENARIO_ID, SCENARIO_IDS, type ScenarioId } from './simulator/scenarios';
import { SimulatedSource, type SimulatedSourceOptions } from './simulator/SimulatedSource';
import { DEFAULT_SOURCE_KIND, SOURCE_KIND_IDS, type SourceKind } from './sourceCatalog';
import { SOURCE_TRAITS } from './sourceTraits';
import { DEFAULT_SPEED, SPEEDS, type Speed } from './speedCatalog';
import { MS_PER_SECOND } from '../../shared/time';
import { useSignalSource } from './useSignalSource';
import { RecordedSource, type RecordedSourceOptions } from './recording/RecordedSource';
import {
  DEFAULT_RECORDING_ID,
  RECORDING_DURATION_MIN,
  RECORDING_IDS,
  RECORDINGS_CREDITS_URL,
  type RecordingId,
} from './recording/recordingCatalog';
import { BleSource, type BleSourceOptions } from './ble/BleSource';
import { browserBluetooth, type BluetoothAdapter } from './ble/webBluetooth';
import { CameraSource } from './camera/CameraSource';
import { cameraApiAvailable } from './camera/cameraCapture';

export type CreateSimulatedSource = (options: SimulatedSourceOptions) => SignalSource;
export type CreateBleSource = (options: BleSourceOptions) => SignalSource;
export type CreateCameraSource = () => SignalSource;

const createDefaultSource: CreateSimulatedSource = (options) =>
  new SimulatedSource(options);
const createDefaultRecording = (options: RecordedSourceOptions): SignalSource => new RecordedSource(options);
const createDefaultBle: CreateBleSource = (options) => new BleSource(options);
const createDefaultCamera: CreateCameraSource = () => new CameraSource();

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
  readonly createCamera?: CreateCameraSource;
  /** Whether the browser exposes the camera API; injected by tests like the Bluetooth adapter. */
  readonly cameraAvailable?: boolean;
}

/**
 * Acquisition layer panel: picks the source (simulator, example recording,
 * Bluetooth strap or the experimental camera pulse), connects or disconnects,
 * and always shows the connection state (HU-01) with the latest reading
 * received.
 */
export function AcquisitionPanel({
  source,
  onSourceChange,
  createSource = createDefaultSource,
  createRecording = createDefaultRecording,
  createBle = createDefaultBle,
  bluetooth = browserBluetooth(),
  createCamera = createDefaultCamera,
  cameraAvailable = cameraApiAvailable(),
}: AcquisitionPanelProps): React.JSX.Element {
  const t = useMessages();
  const [kind, setKind] = useState<SourceKind>(DEFAULT_SOURCE_KIND);
  const [recordId, setRecordId] = useState<RecordingId>(DEFAULT_RECORDING_ID);
  const [scenario, setScenario] = useState<ScenarioId>(DEFAULT_SCENARIO_ID);
  const [speed, setSpeed] = useState<Speed>(DEFAULT_SPEED);
  const reading = useSignalSource(source);
  const titleId = useId();

  // Typed views of the dictionary: a new source, state, scenario or recording cannot ship without its text.
  const sourceNames: Readonly<Record<SourceKind, string>> = t.acquisition.sources;
  const connectLabels: Readonly<Record<SourceKind, string>> = t.acquisition.connect;
  // Connection notices of the sources that open a device; the rest only report discarded readings.
  const connectionNotices: Readonly<Partial<Record<SourceKind, (reason: string) => string>>> = {
    ble: t.acquisition.sourceErrors.ble,
    camera: t.acquisition.sourceErrors.camera,
  };
  const stateNames: Readonly<Record<ConnectionState, string>> = t.acquisition.connectionStates;
  const scenarioNames: Readonly<Record<ScenarioId, string>> = t.acquisition.scenarios;
  const recordingNames: Readonly<Record<RecordingId, string>> = t.acquisition.recordings;

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
    // Called inside the click handler: Web Bluetooth and the camera need the user gesture.
    void newSource.connect();
  };

  /** Whether the browser lacks what a source needs (RNF-10). */
  const unavailable = (id: SourceKind): boolean =>
    (SOURCE_TRAITS[id].requiresBluetooth && bluetooth === null) || (SOURCE_TRAITS[id].requiresCamera && !cameraAvailable);

  // Keyed by the catalog, so a new kind cannot ship without a way to start it.
  const sourceFactories: Readonly<Record<SourceKind, () => SignalSource | null>> = {
    simulator: () => createSource({ scenario, speed, seed: SIMULATOR_SEED }),
    recording: () => createRecording({ recordId, speed }),
    ble: () => (bluetooth === null ? null : createBle({ bluetooth, mode: 'choose' })),
    camera: () => (cameraAvailable ? createCamera() : null),
  };

  const connect = (): void => {
    const newSource = sourceFactories[kind]();
    if (newSource !== null) start(newSource);
  };

  const reconnectRemembered = (): void => {
    if (bluetooth !== null) start(createBle({ bluetooth, mode: 'remembered' }));
  };

  const canRemember = kind === 'ble' && bluetooth?.getDevices !== undefined;
  const errorReason = reading.error === null ? null : describeSourceError(reading.error, t.acquisition);
  // The notice follows the selected source (proposal P-02, item 5 keeps this open).
  const connectionNotice = connectionNotices[kind];
  const errorText = errorReason === null ? null
    : kind === 'recording' ? t.acquisition.sourceErrors.recording(errorReason)
      : connectionNotice !== undefined && reading.state === 'error' ? connectionNotice(errorReason)
        : t.acquisition.sourceErrors.discarded(errorReason);

  const disconnect = (): void => {
    void source?.disconnect();
  };

  return (
    <section
      aria-labelledby={titleId}
      className="acquisition-panel"
    >
      <h2 id={titleId}>
        {t.acquisition.title}
      </h2>

      <div className="source-controls">
        <label>
          {t.acquisition.sourceLabel}
          <select value={kind} disabled={active} onChange={event => {
            setKind(parseOption(SOURCE_KIND_IDS, event.target.value, DEFAULT_SOURCE_KIND));
          }}>
            {SOURCE_KIND_IDS.map((id) => (
              <option key={id} value={id} disabled={unavailable(id)}>
                {SOURCE_TRAITS[id].experimental ? t.acquisition.experimentalOption(sourceNames[id]) : sourceNames[id]}
              </option>
            ))}
          </select>
        </label>
        {kind === 'simulator' ? <label>
          {t.acquisition.scenarioLabel}
          <select
            value={scenario}
            disabled={active}
            onChange={(event) => {
              setScenario(parseOption(SCENARIO_IDS, event.target.value, DEFAULT_SCENARIO_ID));
            }}
          >
            {SCENARIO_IDS.map((id) => (
              <option key={id} value={id}>
                {scenarioNames[id]}
              </option>
            ))}
          </select>
        </label> : kind === 'recording' ? <label>
          {t.acquisition.recordingLabel}
          <select value={recordId} disabled={active} onChange={event => {
            setRecordId(parseOption(RECORDING_IDS, event.target.value, DEFAULT_RECORDING_ID));
          }}>
            {RECORDING_IDS.map((id) => <option key={id} value={id}>
              {t.acquisition.recordingOption(recordingNames[id], RECORDING_DURATION_MIN)}
            </option>)}
          </select>
        </label> : null}

        {SOURCE_TRAITS[kind].adjustableSpeed && <label>
          {t.acquisition.speedLabel}
          <select
            value={speed}
            disabled={active}
            onChange={(event) => {
              setSpeed(parseOption(SPEEDS, event.target.value, DEFAULT_SPEED));
            }}
          >
            {SPEEDS.map((v) => (
              <option key={v} value={v}>
                {t.acquisition.speedOption(v)}
              </option>
            ))}
          </select>
        </label>}
      </div>
      {kind === 'recording' && <p className="recording-note">
        {t.acquisition.recordingNote}{' '}
        <a href={RECORDINGS_CREDITS_URL}>{t.acquisition.recordingCredits}</a>
      </p>}
      {bluetooth === null && <p className="recording-note">
        {t.acquisition.bluetoothUnsupported}
      </p>}
      {kind === 'ble' && <p className="recording-note">
        {t.acquisition.bleNote}
      </p>}
      {!cameraAvailable && <p className="recording-note">
        {t.acquisition.cameraUnsupported}
      </p>}
      {kind === 'camera' && <p className="recording-note">
        {t.acquisition.cameraNote}
      </p>}

      <div className="action-row source-button">
        <button
          type="button"
          className="button button-secondary"
          onClick={active ? disconnect : connect}
        >
          {active ? t.acquisition.disconnect : connectLabels[kind]}
        </button>
        {canRemember && !active && <button type="button" className="button button-secondary" onClick={reconnectRemembered}>
          {t.acquisition.reconnectRemembered}
        </button>}
      </div>

      <p role="status" className="connection-status" data-state={reading.state}>
        {t.acquisition.connectionStatus} <strong>{stateNames[reading.state]}</strong>
      </p>

      {errorText !== null && (
        <p role="alert" className="quiet-notice">{errorText}</p>
      )}

      <dl className="source-metrics">
        <dt>{t.acquisition.metrics.heartRate}</dt>
        <dd data-testid="heart-rate">
          {reading.last === null
            ? t.common.noValue
            : t.common.withUnit(String(reading.last.heartRate), t.common.units.beatsPerMinute)}
        </dd>
        <dt>{t.acquisition.metrics.receivedBeats}</dt>
        <dd data-testid="received-beats">{reading.receivedBeats}</dd>
        <dt>{t.acquisition.metrics.signalTime}</dt>
        <dd data-testid="signal-time">
          {reading.last === null ? t.common.noValue : formatClock(reading.last.timeMs / MS_PER_SECOND)}
        </dd>
      </dl>
    </section>
  );
}
