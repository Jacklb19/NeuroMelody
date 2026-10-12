import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { MS_PER_SECOND } from '../../shared/time';
import { createFakeTimeEnvironment } from '../../test/fakeTimeEnvironment';
import { SimulatedSource } from '../acquisition/simulator/SimulatedSource';
import { CollectionPage } from './CollectionPage';
import { COLLECTION_STAGE_IDS, STAGE_SECONDS } from './collectionProtocol';
import { CollectionStoreContext, MemoryCollectionStore } from './collectionStore';

const copy = es.collection;

function renderPage() {
  const env = createFakeTimeEnvironment();
  const store = new MemoryCollectionStore();
  render(
    <CollectionStoreContext value={store}>
      <MemoryRouter>
        <CollectionPage createSource={(options) => new SimulatedSource({ ...options, clock: env.clock, scheduler: env.scheduler })} />
      </MemoryRouter>
    </CollectionStoreContext>,
  );
  return { env, store };
}

describe('CollectionPage', () => {
  it('does not start without the explicit consent and a connected source', async () => {
    const user = userEvent.setup();
    const { store } = renderPage();
    const begin = screen.getByRole('button', { name: copy.begin });
    expect(begin).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: copy.consent.label }));
    expect(begin).toBeDisabled();
    await user.click(screen.getByRole('button', { name: es.acquisition.connect.simulator }));
    expect(begin).toBeEnabled();

    await user.click(screen.getByRole('checkbox', { name: copy.consent.label }));
    expect(begin).toBeDisabled();
    expect(await store.list()).toEqual([]);
  });

  it('guides the three stages, saves each with its label and keeps the recording on the device', async () => {
    const user = userEvent.setup();
    const { env, store } = renderPage();
    await user.click(screen.getByRole('checkbox', { name: copy.consent.label }));
    await user.click(screen.getByRole('button', { name: es.acquisition.connect.simulator }));
    await user.click(screen.getByRole('button', { name: copy.begin }));

    for (const id of COLLECTION_STAGE_IDS) {
      expect(screen.getByRole('heading', { level: 2, name: copy.stages[id].name })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: copy.startStage }));
      expect(screen.getByTestId('collection-remaining')).toBeInTheDocument();
      // One second more than the stage: its first notification only marks where it starts.
      act(() => { env.advance((STAGE_SECONDS[id] + 2) * MS_PER_SECOND); });
    }

    expect(await screen.findByRole('heading', { level: 2, name: copy.saved.title })).toBeInTheDocument();
    // The simulator is good for trying the protocol; the screen says its beats teach nothing.
    expect(screen.getAllByText(copy.demoSource).length).toBeGreaterThan(0);

    const [saved] = await store.list();
    expect(saved?.sourceKind).toBe('simulator');
    expect(saved?.segments.map((segment) => segment.label)).toEqual([...COLLECTION_STAGE_IDS]);
    for (const segment of saved?.segments ?? []) {
      // Close to one beat per second for the whole stage, all inside it.
      expect(segment.rrMs.length).toBeGreaterThan(segment.plannedSeconds / 2);
      expect(Math.max(...segment.beatTimesMs)).toBeLessThanOrEqual(segment.plannedSeconds * MS_PER_SECOND);
    }
    expect(screen.getByRole('button', { name: copy.list.exportAll(1) })).toBeInTheDocument();
  });
});
