import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { reportPath, ROUTES } from '../../config/routes';
import { es } from '../../i18n/es';
import { MemorySessionStore } from '../records/sessionStore';
import { renderWithStore } from '../../test/renderWithStore';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { ProgressPage } from './ProgressPage';
import { DEFAULT_PROGRESS_RANGE } from './progressRangeCatalog';

const { progress } = es;

const OLDER = sessionRecord({
  id: '017f22e2-79b0-7000-8000-000000000001',
  startedAt: '2026-10-05T10:00:00.000Z',
  endedAt: '2026-10-05T10:20:00.000Z',
  samples: [sample(5, { meanHr: 78, rmssd: 20 }), sample(10, { meanHr: 68, rmssd: 30 })],
});
const NEWER = sessionRecord({
  id: '017f22e2-79b0-7000-8000-000000000002',
  startedAt: '2026-10-06T10:00:00.000Z',
  endedAt: '2026-10-06T10:20:00.000Z',
  ratingBefore: null,
  ratingAfter: null,
});

describe('ProgressPage', () => {
  it('shows a read failure instead of claiming the history is empty', async () => {
    const store = new MemorySessionStore();
    vi.spyOn(store, 'list').mockRejectedValue(new Error('unavailable'));
    renderWithStore(ROUTES.progress, ROUTES.progress, <ProgressPage />, store);
    expect(await screen.findByRole('alert')).toHaveTextContent(es.records.readFailed(es.common.unknownError));
    expect(screen.queryByText(progress.empty)).toBeNull();
  });
  it('invites to a first session when nothing is saved', async () => {
    renderWithStore(ROUTES.progress, ROUTES.progress, <ProgressPage />);
    expect(await screen.findByText(progress.empty)).toBeVisible();
    expect(screen.getByRole('link', { name: progress.planSession })).toHaveAttribute('href', ROUTES.plan);
  });

  it('describes each metric, reads a session from the keyboard and lists the same figures as a table', async () => {
    const user = userEvent.setup();
    const store = new MemorySessionStore();
    await store.save(OLDER);
    await store.save(NEWER);
    renderWithStore(ROUTES.progress, ROUTES.progress, <ProgressPage />, store);

    expect(await screen.findByTestId('insight-heartRate')).toHaveTextContent(progress.metrics.heartRate.insight(1, 1));
    expect(screen.getByTestId('insight-rating')).toHaveTextContent(progress.metrics.rating.insight(1, 1));

    // The readout opens on the most recent session and the arrow keys move it.
    const pulse = screen.getByRole('img', { name: progress.metrics.heartRate.chartLabel });
    pulse.focus();
    await user.keyboard('{ArrowLeft}');
    expect(within(pulse).getByTestId('trend-readout'))
      .toHaveTextContent(es.common.withUnit('68', es.common.units.beatsPerMinute));

    const rows = within(screen.getByRole('table', { name: progress.table.caption, hidden: true })).getAllByRole('row', { hidden: true });
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent(es.common.withUnit(es.records.change('78', '68'), es.common.units.beatsPerMinute));
    expect(rows[2]).toHaveTextContent(es.records.noAnswer);

    // The printable report opens on the sessions shown here.
    expect(screen.getByRole('link', { name: progress.report.action })).toHaveAttribute('href', reportPath(DEFAULT_PROGRESS_RANGE));
  });
});
