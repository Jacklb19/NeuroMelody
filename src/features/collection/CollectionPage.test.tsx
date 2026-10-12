import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { MS_PER_SECOND } from '../../shared/time';
import { createFakeTimeEnvironment } from '../../test/fakeTimeEnvironment';
import type { BluetoothAdapter } from '../acquisition/ble/webBluetooth';
import type { SignalSource } from '../acquisition/contract';
import { SimulatedSource } from '../acquisition/simulator/SimulatedSource';
import { SIMULATOR_SEED } from '../acquisition/config';
import { DEFAULT_SCENARIO_ID } from '../acquisition/simulator/scenarios';
import { CollectionPage } from './CollectionPage';
import { COLLECTION_STAGE_IDS, STAGE_SECONDS } from './collectionProtocol';
import { CollectionStoreContext, MemoryCollectionStore } from './collectionStore';

const copy = es.collection;

/** Bluetooth as a browser offers it; the strap itself is the fake below. */
const BLUETOOTH = {} as BluetoothAdapter;

function renderPage({ trial = false } = {}) {
  const env = createFakeTimeEnvironment();
  const store = new MemoryCollectionStore();
  const simulated = (): SimulatedSource =>
    new SimulatedSource({ scenario: DEFAULT_SCENARIO_ID, speed: 1, seed: SIMULATOR_SEED, clock: env.clock, scheduler: env.scheduler });
  // A strap for the test: the beats of the simulator, presented as the source that measures the person.
  const strap = (): SignalSource => {
    const beats = simulated();
    return {
      kind: 'ble',
      get state() { return beats.state; },
      connect: () => beats.connect(),
      disconnect: () => beats.disconnect(),
      subscribe: (observer) => beats.subscribe(observer),
    };
  };
  render(
    <CollectionStoreContext value={store}>
      <MemoryRouter>
        <CollectionPage acquisition={{ createSource: simulated, createBle: strap, bluetooth: BLUETOOTH, startInTrial: trial }} />
      </MemoryRouter>
    </CollectionStoreContext>,
  );
  return { env, store };
}

const connectStrap = es.acquisition.connect.ble;

describe('CollectionPage', () => {
  it('does not start without the explicit consent and a connected source', async () => {
    const user = userEvent.setup();
    const { store } = renderPage();
    const begin = screen.getByRole('button', { name: copy.begin });
    expect(begin).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: copy.consent.label }));
    expect(begin).toBeDisabled();
    await user.click(screen.getByRole('button', { name: connectStrap }));
    expect(begin).toBeEnabled();

    await user.click(screen.getByRole('checkbox', { name: copy.consent.label }));
    expect(begin).toBeDisabled();
    expect(await store.list()).toEqual([]);
  });

  it('guides the three stages, saves each with its label and keeps the recording on the device', async () => {
    const user = userEvent.setup();
    const { env, store } = renderPage();
    await user.click(screen.getByRole('checkbox', { name: copy.consent.label }));
    await user.click(screen.getByRole('button', { name: connectStrap }));
    await user.click(screen.getByRole('button', { name: copy.begin }));

    for (const id of COLLECTION_STAGE_IDS) {
      expect(screen.getByRole('heading', { level: 2, name: copy.stages[id].name })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: copy.startStage }));
      expect(screen.getByTestId('collection-remaining')).toBeInTheDocument();
      // One second more than the stage: its first notification only marks where it starts.
      act(() => { env.advance((STAGE_SECONDS[id] + 2) * MS_PER_SECOND); });
    }

    expect(await screen.findByRole('heading', { level: 2, name: copy.saved.title })).toBeInTheDocument();

    const [saved] = await store.list();
    expect(saved?.sourceKind).toBe('ble');
    expect(saved?.segments.map((segment) => segment.label)).toEqual([...COLLECTION_STAGE_IDS]);
    for (const segment of saved?.segments ?? []) {
      // Close to one beat per second for the whole stage, all inside it.
      expect(segment.rrMs.length).toBeGreaterThan(segment.plannedSeconds / 2);
      expect(Math.max(...segment.beatTimesMs)).toBeLessThanOrEqual(segment.plannedSeconds * MS_PER_SECOND);
    }
    expect(screen.getByRole('button', { name: copy.list.exportAll(1) })).toBeInTheDocument();
  });

  it('lets the protocol be tried with the simulator and keeps nothing of it', async () => {
    const user = userEvent.setup();
    const { env, store } = renderPage({ trial: true });
    await user.click(screen.getByRole('checkbox', { name: copy.consent.label }));
    await user.click(screen.getByRole('button', { name: es.acquisition.connect.simulator }));
    // Said before starting, not only at the end.
    expect(screen.getByText(copy.demoSource)).toBeVisible();
    await user.click(screen.getByRole('button', { name: copy.begin }));

    for (const id of COLLECTION_STAGE_IDS) {
      await user.click(screen.getByRole('button', { name: copy.startStage }));
      act(() => { env.advance((STAGE_SECONDS[id] + 2) * MS_PER_SECOND); });
    }

    expect(await screen.findByRole('heading', { level: 2, name: copy.trialDone.title })).toBeInTheDocument();
    expect(await store.list()).toEqual([]);
  });
});
