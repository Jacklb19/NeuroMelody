import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { es } from '../../i18n/es';
import { formatClock } from '../../shared/formatClock';
import { MS_PER_SECOND } from '../../shared/time';
import { createFakeTimeEnvironment } from '../../test/fakeTimeEnvironment';
import { SourceChannel } from './sourceChannel';
import type { SignalSource } from './contract';
import { AcquisitionPanel, type CreateBleSource, type CreateSimulatedSource } from './AcquisitionPanel';
import { MAX_HR, MIN_HR, SIMULATOR_SEED } from './config';
import type { BluetoothAdapter } from './ble/webBluetooth';
import { SimulatedSource } from './simulator/SimulatedSource';
import { RecordedSource, type RecordedSourceOptions } from './recording/RecordedSource';
import { RECORDING_DURATION_MS, RECORDINGS_DIRECTORY, recordingFileName } from './recording/recordingCatalog';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const text = es.acquisition;

/** The panel is controlled: this harness keeps the source the way App does. */
function StatefulPanel({ createSource, createRecording }: {
  readonly createSource: CreateSimulatedSource;
  readonly createRecording?: (options: RecordedSourceOptions) => SignalSource;
}) {
  const [source, setSource] = useState<SignalSource | null>(null);
  return <AcquisitionPanel source={source} onSourceChange={setSource} createSource={createSource} createRecording={createRecording} />;
}

function renderWithFakeTime() {
  const env = createFakeTimeEnvironment();
  const createSource = vi.fn<CreateSimulatedSource>(
    (options) => new SimulatedSource({ ...options, clock: env.clock, scheduler: env.scheduler }),
  );
  const result = render(<StatefulPanel createSource={createSource} />);
  return { env, createSource, ...result };
}

function visibleState(): string {
  return screen.getByRole('status').textContent;
}

/** Status line as the panel shows it for a connection state. */
function stateLine(state: keyof typeof text.connectionStates): string {
  return `${text.connectionStatus} ${text.connectionStates[state]}`;
}

const combobox = (name: string): HTMLElement => screen.getByRole('combobox', { name });

describe('AcquisitionPanel', () => {
  it('plays a selected recording and re-enables the controls at the end', async () => {
    const user = userEvent.setup();
    const env = createFakeTimeEnvironment();
    const speed = 10;
    const createRecording = vi.fn((options: RecordedSourceOptions) => new RecordedSource({ ...options, ...env,
      load: () => Promise.resolve(JSON.parse(readFileSync(join('public', RECORDINGS_DIRECTORY, recordingFileName(options.recordId)), 'utf8')) as unknown),
    }));
    render(<StatefulPanel createSource={options => new SimulatedSource(options)} createRecording={createRecording} />);
    await user.selectOptions(combobox(text.sourceLabel), 'recording');
    await user.selectOptions(combobox(text.recordingLabel), 'nsr002');
    await user.selectOptions(combobox(text.speedLabel), String(speed));
    await user.click(screen.getByRole('button', { name: text.connect.recording }));
    expect(createRecording).toHaveBeenCalledWith({ recordId: 'nsr002', speed });
    expect(combobox(text.recordingLabel)).toBeDisabled();
    act(() => { env.jump(RECORDING_DURATION_MS / speed); });
    expect(screen.getByTestId('signal-time')).toHaveTextContent(formatClock(RECORDING_DURATION_MS / MS_PER_SECOND));
    expect(visibleState()).toBe(stateLine('disconnected'));
    expect(combobox(text.recordingLabel)).toBeEnabled();
  });
  it('shows the disconnected state and labelled controls', () => {
    renderWithFakeTime();

    expect(screen.getByRole('heading', { level: 2, name: text.title })).toBeInTheDocument();
    expect(combobox(text.scenarioLabel)).toBeEnabled();
    expect(combobox(text.speedLabel)).toBeEnabled();
    expect(visibleState()).toBe(stateLine('disconnected'));
    expect(screen.getByTestId('heart-rate')).toHaveTextContent(es.common.noValue);
  });

  it('offers the five scenarios and the four speeds', () => {
    renderWithFakeTime();

    const scenarios = screen.getAllByRole('option').map((o) => o.textContent);
    expect(scenarios).toEqual([
      text.sources.simulator,
      text.sources.recording,
      text.sources.ble,
      text.scenarios.rest,
      text.scenarios.activation,
      text.scenarios.progressive_relaxation,
      text.scenarios.progressive_activation,
      text.scenarios.artifacts,
      text.speedOption(1),
      text.speedOption(2),
      text.speedOption(5),
      text.speedOption(10),
    ]);
  });

  it('connects from the keyboard with the chosen scenario and speed', async () => {
    const user = userEvent.setup();
    const { createSource } = renderWithFakeTime();

    await user.selectOptions(combobox(text.scenarioLabel), 'activation');
    await user.selectOptions(combobox(text.speedLabel), '10');
    screen.getByRole('button', { name: text.connect.simulator }).focus();
    await user.keyboard('{Enter}');

    expect(createSource).toHaveBeenCalledWith({
      scenario: 'activation',
      speed: 10,
      seed: SIMULATOR_SEED,
    });
    expect(visibleState()).toBe(stateLine('connected'));
    expect(combobox(text.scenarioLabel)).toBeDisabled();
    expect(screen.getByRole('button', { name: text.disconnect })).toBeInTheDocument();
  });

  it('shows the latest reading while notifications arrive', async () => {
    const user = userEvent.setup();
    const { env } = renderWithFakeTime();

    await user.click(screen.getByRole('button', { name: text.connect.simulator }));
    act(() => {
      env.advance(3000);
    });

    expect(screen.getByTestId('heart-rate')).toHaveTextContent(new RegExp(`^\\d+ ${es.common.units.beatsPerMinute}$`));
    expect(Number(screen.getByTestId('received-beats').textContent)).toBeGreaterThan(0);
    expect(screen.getByTestId('signal-time')).toHaveTextContent('00:03');
  });

  it('disconnects, stops the source and re-enables the controls', async () => {
    const user = userEvent.setup();
    const { env } = renderWithFakeTime();

    await user.click(screen.getByRole('button', { name: text.connect.simulator }));
    await user.click(screen.getByRole('button', { name: text.disconnect }));

    expect(visibleState()).toBe(stateLine('disconnected'));
    expect(env.active).toBe(false);
    expect(combobox(text.scenarioLabel)).toBeEnabled();
  });

  it('stops the source when the panel unmounts', async () => {
    const user = userEvent.setup();
    const { env, unmount } = renderWithFakeTime();

    await user.click(screen.getByRole('button', { name: text.connect.simulator }));
    unmount();

    expect(env.active).toBe(false);
  });

  it('warns, without clinical language, when the source discards a measurement', async () => {
    const user = userEvent.setup();
    const channel = new SourceChannel();
    const source: SignalSource = {
      kind: 'simulator',
      get state() {
        return channel.state;
      },
      connect: () => {
        channel.changeState('connected');
        return Promise.resolve();
      },
      disconnect: () => {
        channel.changeState('disconnected');
        return Promise.resolve();
      },
      subscribe: (observer) => channel.subscribe(observer),
    };
    render(<StatefulPanel createSource={() => source} />);

    await user.click(screen.getByRole('button', { name: text.connect.simulator }));
    act(() => {
      channel.notify({ timeMs: 1000, heartRate: 400, rrIntervalsMs: [], sensorContact: true });
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      text.sourceErrors.discarded(text.notificationIssues.heart_rate_out_of_range(MIN_HR, MAX_HR)),
    );
  });

  it('disables the Bluetooth option when the browser lacks Web Bluetooth', () => {
    render(<AcquisitionPanel source={null} onSourceChange={vi.fn()} bluetooth={null} />);
    expect(screen.getByRole('option', { name: text.sources.ble })).toBeDisabled();
    expect(screen.getByText(text.bluetoothUnsupported)).toBeInTheDocument();
  });

  it('connects a chosen strap or reuses a remembered one', async () => {
    const user = userEvent.setup();
    const bluetooth: BluetoothAdapter = {
      requestDevice: () => Promise.reject(new Error('unused')),
      getDevices: () => Promise.resolve([]),
    };
    const createBle = vi.fn<CreateBleSource>(() => new FakeSource());
    const onSourceChange = vi.fn();
    render(<AcquisitionPanel source={null} onSourceChange={onSourceChange} bluetooth={bluetooth} createBle={createBle} />);

    await user.selectOptions(combobox(text.sourceLabel), 'ble');
    expect(screen.queryByRole('combobox', { name: text.speedLabel })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: text.connect.ble }));
    await user.click(screen.getByRole('button', { name: text.reconnectRemembered }));

    expect(createBle.mock.calls.map(([options]) => options.mode)).toEqual(['choose', 'remembered']);
    expect(onSourceChange).toHaveBeenCalledTimes(2);
  });
});

/** Inert source: the panel only needs the contract to render its state. */
class FakeSource implements SignalSource {
  readonly kind = 'ble' as const;
  readonly #channel = new SourceChannel();
  get state() { return this.#channel.state; }
  subscribe = this.#channel.subscribe.bind(this.#channel);
  connect = (): Promise<void> => Promise.resolve();
  disconnect = (): Promise<void> => Promise.resolve();
}
