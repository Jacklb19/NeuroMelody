import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ROUTE_SEGMENTS, ROUTES, summaryPath } from '../../config/routes';
import { es } from '../../i18n/es';
import { MemorySessionStore } from '../records/sessionStore';
import { renderWithStore } from '../../test/renderWithStore';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { SessionSummaryPage } from './SessionSummaryPage';

const RECORD = sessionRecord({
  ratingAfter: null,
  samples: [80, 78, 76, 70, 68, 66].map((meanHr, i) => sample((i + 1) * 5, { meanHr, estimatedState: 'low' })),
});

async function renderSummary(id: string = RECORD.id): Promise<MemorySessionStore> {
  const store = new MemorySessionStore();
  await store.save(RECORD);
  renderWithStore(summaryPath(id), `/${ROUTE_SEGMENTS.summary}`, <SessionSummaryPage />, store);
  return store;
}

describe('SessionSummaryPage', () => {
  it('explains when the session is not on this device', async () => {
    await renderSummary('017f22e2-79b0-7000-8000-00000000ffff');
    expect(await screen.findByRole('heading', { level: 1, name: es.summary.missing.title })).toBeVisible();
    expect(screen.getByRole('link', { name: es.summary.goToHistory })).toHaveAttribute('href', ROUTES.history);
  });

  it('shows the start and end indicators without clinical claims', async () => {
    await renderSummary();
    expect(await screen.findByTestId('summary-heart-rate')).toHaveTextContent(
      es.common.withUnit(es.records.change('78', '68'), es.common.units.beatsPerMinute),
    );
    expect(screen.getByText(/no miden el dolor/i)).toBeVisible();
    expect(screen.getByText(es.summary.pending.title)).toBeVisible();
    expect(screen.getByRole('button', { name: es.summary.download })).toBeEnabled();
  });

  it('saves how the person feels after listening', async () => {
    const user = userEvent.setup();
    const store = await renderSummary();
    const save = await screen.findByRole('button', { name: es.summary.afterRating.save });
    expect(save).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: '8' }));
    await user.click(save);

    expect(await screen.findByText(es.records.change('4', '8'))).toBeVisible();
    expect(screen.getByText(es.summary.ratingChange.more(4))).toBeVisible();
    expect((await store.get(RECORD.id))?.ratingAfter).toBe(8);
  });
});
