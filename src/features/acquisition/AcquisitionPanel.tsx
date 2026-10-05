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

/** Fixed seed: the same simulated session repeats on reconnect (RF-02). */
export const SIMULATOR_SEED = 1;

export type CreateSimulatedSource = (options: SimulatedSourceOptions) => SignalSource;

const createDefaultSource: CreateSimulatedSource = (options) =>
  new SimulatedSource(options);

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
}

/**
 * Acquisition layer panel: picks the simulator scenario and speed, connects
 * or disconnects, and always shows the connection state (HU-01) with the
 * latest reading received.
 */
export function AcquisitionPanel({
  source,
  onSourceChange,
  createSource = createDefaultSource,
}: AcquisitionPanelProps): React.JSX.Element {
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

  const connect = (): void => {
    const newSource = createSource({ scenario, speed, seed: SIMULATOR_SEED });
    onSourceChange(newSource);
    void newSource.connect();
  };

  const disconnect = (): void => {
    void source?.disconnect();
  };

  return (
    <section
      aria-labelledby={titleId}
      style={{
        border: 'var(--border-width) solid var(--color-border)',
        borderRadius: 'var(--border-radius)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-8)',
      }}
    >
      <h2 id={titleId} style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
        Fuente de señal
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'grid', gap: 'var(--space-1)' }}>
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
        </label>

        <label style={{ display: 'grid', gap: 'var(--space-1)' }}>
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
        </label>
      </div>

      <button
        type="button"
        onClick={active ? disconnect : connect}
        style={{
          padding: 'var(--space-2) var(--space-4)',
          backgroundColor: 'var(--color-button-background)',
          color: 'var(--color-button-text)',
          border: 'none',
          borderRadius: 'var(--border-radius)',
          cursor: 'pointer',
          fontSize: 'var(--text-base)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {active ? 'Desconectar' : 'Conectar simulador'}
      </button>

      <p role="status" style={{ marginBottom: 'var(--space-4)' }}>
        Estado de la conexión: <strong>{STATE_TEXT[reading.state]}</strong>
      </p>

      {reading.error !== null && (
        <p role="alert" style={{ color: 'var(--color-error-text)', marginBottom: 'var(--space-4)' }}>
          La medición no es fiable y se descartó ({reading.error}). Revisa la colocación del dispositivo.
        </p>
      )}

      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: 'var(--space-1) var(--space-4)' }}>
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
