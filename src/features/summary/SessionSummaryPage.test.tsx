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

async function renderSummary(id: string = RECORD.id, record = RECORD): Promise<MemorySessionStore> {
  const store = new MemorySessionStore();
  await store.save(record);
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
    // Without an account the plain-language text says what it needs instead of pretending to be pending.
    expect(screen.getByText(es.summary.automatic.unavailable)).toBeVisible();
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

  it('tells what the music did when the session kept it (ADR-42)', async () => {
    const music = { startTempoBpm: 72, endTempoBpm: 59, steps: [{ atS: 200, level: 'target' as const, calmer: true }] };
    await renderSummary(RECORD.id, { ...RECORD, music });
    expect(await screen.findByRole('heading', { level: 2, name: es.session.recap.title })).toBeVisible();
    expect(screen.getByText(es.session.recap.tempo('72', '59'))).toBeVisible();
    expect(screen.getByText(es.session.recap.calmerStep(4, es.session.journey.levels.target))).toBeVisible();
  });

  it('says nothing about the music for a session that did not keep it', async () => {
    await renderSummary();
    await screen.findByTestId('summary-heart-rate');
    expect(screen.queryByRole('heading', { name: es.session.recap.title })).not.toBeInTheDocument();
  });
});
