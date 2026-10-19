import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { es } from '../../i18n/es';
import { renderWithStore } from '../../test/renderWithStore';
import { sessionRecord } from '../../test/sessionRecords';
import { createSessionContext } from '../records/sessionContext';
import { MemorySessionStore } from '../records/sessionStore';
import { PlanPage } from './PlanPage';

const RECORDS = Array.from({ length: 10 }, (_, index) => sessionRecord({
  context: createSessionContext(index < 5 ? 'piano' : 'warm', index < 5 ? 'rain' : 'none'),
  plannedMinutes: index < 5 ? 30 : 10, ratingBefore: 4, ratingAfter: index < 5 ? 7 : 5,
}));

describe('PersonalPlanCard in the plan', () => {
  it('never overwrites a manual edit when history arrives, and applies only on acceptance', async () => {
    const store = new MemorySessionStore();
    let finish: (records: typeof RECORDS) => void = () => undefined;
    vi.spyOn(store, 'list').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderWithStore('/plan', '/plan', <PlanPage />, store);
    const bowls = screen.getByRole('radio', { name: es.plan.instrument.names.bowls });
    await userEvent.click(bowls);
    await act(async () => { finish(RECORDS); await Promise.resolve(); });
    expect(bowls).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: es.insights.forYou.accept }));
    expect(screen.getByRole('radio', { name: es.plan.instrument.names.piano })).toBeChecked();
    expect(screen.getByRole('radio', { name: es.plan.ambience.names.rain })).toBeChecked();
    expect(screen.getByRole('radio', { name: es.plan.minutes(30) })).toBeChecked();
    await userEvent.click(bowls);
    expect(bowls).toBeChecked();
  });

  it('retains explicit valid link values when accepting other suggested fields', async () => {
    const store = new MemorySessionStore();
    vi.spyOn(store, 'list').mockResolvedValue(RECORDS);
    renderWithStore('/plan?instrument=bowls&duration=15', '/plan', <PlanPage />, store);
    await userEvent.click(await screen.findByRole('button', { name: es.insights.forYou.accept }));
    await waitFor(() => { expect(screen.getByRole('radio', { name: es.plan.ambience.names.rain })).toBeChecked(); });
    expect(screen.getByRole('radio', { name: es.plan.instrument.names.bowls })).toBeChecked();
    expect(screen.getByRole('radio', { name: es.plan.minutes(15) })).toBeChecked();
  });
});
