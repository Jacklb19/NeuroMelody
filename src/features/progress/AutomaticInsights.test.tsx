import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { LocaleContext } from '../../i18n/messages';
import { es } from '../../i18n/es';
import { en } from '../../i18n/en';
import type { Locale } from '../../i18n/locale';
import { sessionRecord } from '../../test/sessionRecords';
import type { SessionRecord } from '../records/sessionRecord';
import { createSessionContext } from '../records/sessionContext';
import type { CloudApi } from '../cloud/cloudApi';
import { CloudSyncContext, type CloudSyncValue } from '../cloud/cloudSyncContext';
import { AutomaticInsights } from './AutomaticInsights';
import { historyInsights } from './historyInsights';
import type { ProgressRangeId } from './progressRangeCatalog';
import type { ProgressNarrative } from './progressNarrative';

const RECORDS = Array.from({ length: 10 }, (_, index) => sessionRecord({
  context: createSessionContext(index < 5 ? 'piano' : 'warm', 'rain'),
  ratingBefore: 4, ratingAfter: index < 5 ? 7 : 5,
}));
const COMPARISONS = historyInsights(RECORDS).observations;
const NARRATIVE: ProgressNarrative = { framing: 'balance', observationIds: ['o1'] };
function view(api: CloudApi | null, records: readonly SessionRecord[] = RECORDS, range: ProgressRangeId = 'all', locale: Locale = 'es') {
  return <MemoryRouter><LocaleContext value={locale}><CloudSyncContext value={{ api, status: api === null ? 'signed_out' : 'synced' } as CloudSyncValue}>
    <AutomaticInsights comparisons={COMPARISONS} records={records} range={range} />
  </CloudSyncContext></LocaleContext></MemoryRouter>;
}

describe('AutomaticInsights', () => {
  it('only sends figures on explicit consent and marks reviewed wording as generated', async () => {
    const summarizeProgress = vi.fn<CloudApi['summarizeProgress']>(() => Promise.resolve(NARRATIVE));
    render(view({ summarizeProgress } as Partial<CloudApi> as CloudApi));
    expect(summarizeProgress).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: es.insights.automatic.ask }));
    expect(await screen.findByText(es.insights.automatic.balance)).toBeVisible();
    expect(screen.getByText(es.insights.automatic.generated)).toBeVisible();
    expect(summarizeProgress).toHaveBeenCalledOnce();
  });

  it('invalidates an explanation on any history edit, range, locale or account change', async () => {
    const api = { summarizeProgress: vi.fn<CloudApi['summarizeProgress']>(() => Promise.resolve(NARRATIVE)) } as unknown as CloudApi;
    const result = render(view(api));
    await userEvent.click(screen.getByRole('button', { name: es.insights.automatic.ask }));
    await screen.findByText(es.insights.automatic.generated);
    result.rerender(view(api, [...RECORDS]));
    expect(screen.queryByText(es.insights.automatic.generated)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: es.insights.automatic.ask }));
    await screen.findByText(es.insights.automatic.generated);
    result.rerender(view(api, RECORDS, 'last30'));
    expect(screen.queryByText(es.insights.automatic.generated)).toBeNull();
    result.rerender(view(api, RECORDS, 'last30', 'en'));
    expect(screen.getByRole('button', { name: en.insights.automatic.ask })).toBeVisible();
    result.rerender(view(null));
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(es.insights.automatic.needsAccount)).toBeVisible();
  });

  it('drops late answers from a previous history without hiding a new answer', async () => {
    let finish: (narrative: ProgressNarrative) => void = () => undefined;
    const summarizeProgress = vi.fn<CloudApi['summarizeProgress']>()
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
      .mockResolvedValueOnce(NARRATIVE);
    const api = { summarizeProgress } as Partial<CloudApi> as CloudApi;
    const result = render(view(api));
    await userEvent.click(screen.getByRole('button', { name: es.insights.automatic.ask }));
    result.rerender(view(api, [...RECORDS]));
    await userEvent.click(screen.getByRole('button', { name: es.insights.automatic.ask }));
    await screen.findByText(es.insights.automatic.balance);
    await act(async () => { finish({ framing: 'overview', observationIds: ['o1'] }); await Promise.resolve(); });
    expect(screen.getByText(es.insights.automatic.balance)).toBeVisible();
    expect(screen.queryByText(es.insights.automatic.overview)).toBeNull();
  });

  it('keeps failure explicit and permits retry without altering local comparisons', async () => {
    const api = { summarizeProgress: vi.fn<CloudApi['summarizeProgress']>(() => Promise.reject(new Error('offline'))) } as unknown as CloudApi;
    render(view(api));
    await userEvent.click(screen.getByRole('button', { name: es.insights.automatic.ask }));
    expect(await screen.findByText(es.insights.automatic.failed)).toBeVisible();
    expect(screen.getByRole('button', { name: es.insights.automatic.ask })).toBeEnabled();
  });
});
