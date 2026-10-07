import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '../../config/routes';
import { es } from '../../i18n/es';
import { MemorySessionStore } from '../records/sessionStore';
import { renderWithStore } from '../../test/renderWithStore';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { HistoryPage } from './HistoryPage';

const { history } = es;

const FIRST = sessionRecord({
  id: '017f22e2-79b0-7000-8000-000000000001',
  startedAt: '2026-10-06T10:00:00.000Z',
  endedAt: '2026-10-06T10:20:00.000Z',
  samples: [sample(5, { rmssd: 20 }), sample(10, { rmssd: 30 })],
});
const SECOND = sessionRecord({
  id: '017f22e2-79b0-7000-8000-000000000002',
  startedAt: '2026-10-07T10:00:00.000Z',
  endedAt: '2026-10-07T10:20:00.000Z',
  ratingBefore: null,
  ratingAfter: null,
});

async function storeWith(...records: Parameters<MemorySessionStore['save']>[0][]): Promise<MemorySessionStore> {
  const store = new MemorySessionStore();
  for (const record of records) await store.save(record);
  return store;
}

describe('HistoryPage', () => {
  it('invites to a first session when nothing is saved', async () => {
    renderWithStore(ROUTES.history, ROUTES.history, <HistoryPage />);
    expect(await screen.findByText(history.empty)).toBeVisible();
    expect(screen.getByRole('link', { name: history.planSession })).toHaveAttribute('href', ROUTES.plan);
  });

  it('lists sessions newest first with their indicators', async () => {
    renderWithStore(ROUTES.history, ROUTES.history, <HistoryPage />, await storeWith(FIRST, SECOND));
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[1] as HTMLElement).getByText(es.records.change('4', '7'))).toBeVisible();
    expect(within(items[1] as HTMLElement).getByText(es.common.withUnit(es.records.change('20', '30'), es.common.units.milliseconds)))
      .toBeVisible();
    expect(within(items[0] as HTMLElement).getByText(es.records.noAnswer)).toBeVisible();
    expect(screen.getByRole('heading', { name: history.evolution.title })).toBeVisible();
  });

  it('deletes a session only after confirming', async () => {
    const user = userEvent.setup();
    const store = await storeWith(FIRST, SECOND);
    renderWithStore(ROUTES.history, ROUTES.history, <HistoryPage />, store);
    const [newest] = await screen.findAllByRole('listitem');

    await user.click(within(newest as HTMLElement).getByRole('button', { name: history.item.delete }));
    expect(await store.list()).toHaveLength(2);
    await user.click(within(newest as HTMLElement).getByRole('button', { name: history.item.confirmDelete }));

    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect((await store.list()).map((record) => record.id)).toEqual([FIRST.id]);
  });

  it('clears the whole history after confirming', async () => {
    const user = userEvent.setup();
    renderWithStore(ROUTES.history, ROUTES.history, <HistoryPage />, await storeWith(FIRST, SECOND));
    await user.click(await screen.findByRole('button', { name: history.clearAll }));
    await user.click(screen.getByRole('button', { name: history.confirmClearAll }));
    expect(await screen.findByText(history.empty)).toBeVisible();
  });
});
