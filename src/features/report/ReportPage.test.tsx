import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_NAME } from '../../config/app';
import { reportPath, ROUTES } from '../../config/routes';
import { es } from '../../i18n/es';
import { formattersFor } from '../../i18n/formatters';
import { MemorySessionStore } from '../records/sessionStore';
import { renderWithStore } from '../../test/renderWithStore';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { ReportPage } from './ReportPage';

const { report } = es;
const format = formattersFor('es');

const OLDER = sessionRecord({
  id: '017f22e2-79b0-7000-8000-000000000001',
  startedAt: '2026-10-05T10:00:00.000Z',
  endedAt: '2026-10-05T10:20:00.000Z',
  sourceKind: 'ble',
  goals: ['relax'],
  samples: [sample(5, { meanHr: 78, rmssd: 20 }), sample(10, { meanHr: 68, rmssd: 30 })],
});
const NEWER = sessionRecord({
  id: '017f22e2-79b0-7000-8000-000000000002',
  startedAt: '2026-10-06T10:00:00.000Z',
  endedAt: '2026-10-06T10:20:00.000Z',
  sourceKind: 'simulator',
  ratingBefore: null,
  ratingAfter: null,
});

async function storeWith(...records: Parameters<MemorySessionStore['save']>[0][]): Promise<MemorySessionStore> {
  const store = new MemorySessionStore();
  for (const record of records) await store.save(record);
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReportPage', () => {
  it('invites to a first session when nothing is saved, without a sheet to print', async () => {
    renderWithStore(ROUTES.report, ROUTES.report, <ReportPage />);
    expect(await screen.findByText(report.empty)).toBeVisible();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: report.print })).not.toBeInTheDocument();
  });

  it('prints a sheet that states its period, where each session was measured and that it is not clinical', async () => {
    const user = userEvent.setup();
    const print = vi.fn();
    vi.stubGlobal('print', print);
    renderWithStore(ROUTES.report, ROUTES.report, <ReportPage />, await storeWith(OLDER, NEWER));

    const sheet = within(await screen.findByRole('article', { name: report.sheetTitle }));
    // The simulated session is nobody's pulse: the sheet covers the measured one alone.
    expect(sheet.getByText(report.period(format.longDate(OLDER.startedAt), format.longDate(OLDER.startedAt)))).toBeInTheDocument();
    expect(sheet.getByTestId('report-insight-heartRate')).toHaveTextContent(report.metrics.heartRate.insight(1, 1));
    expect(sheet.getByText(report.goals.count(es.plan.goals.names.relax, 1))).toBeInTheDocument();

    const rows = sheet.getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent(es.acquisition.sources.ble);
    expect(rows[1]).toHaveTextContent(es.common.withUnit(es.records.change('78', '68'), es.common.units.beatsPerMinute));
    expect(sheet.queryByText(es.acquisition.sources.simulator)).not.toBeInTheDocument();
    // The screen, not the sheet, says a trial session was left out.
    expect(screen.getByTestId('report-excluded')).toHaveTextContent(report.excluded(1));
    expect(sheet.getByText(es.common.nonClinicalIndicators)).toBeInTheDocument();
    expect(sheet.getByText(report.notes.whatItIs(APP_NAME))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: report.print }));
    expect(print).toHaveBeenCalledOnce();
  });

  it('has no sheet when every saved session was made to try the app', async () => {
    renderWithStore(ROUTES.report, ROUTES.report, <ReportPage />, await storeWith(NEWER));
    expect(await screen.findByText(report.onlyTrials)).toBeVisible();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: report.print })).not.toBeInTheDocument();
  });

  it('opens on the range that came in the address', async () => {
    const path = reportPath('last7');
    renderWithStore(path, ROUTES.report, <ReportPage />, await storeWith(OLDER));
    expect(await screen.findByRole('button', { name: es.progress.range.last(7) })).toHaveAttribute('aria-pressed', 'true');
  });
});
