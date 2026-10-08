import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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
  renderWithStore(`/summary/${id}`, '/summary/:id', <SessionSummaryPage />, store);
  return store;
}

describe('SessionSummaryPage', () => {
  it('explains when the session is not on this device', async () => {
    await renderSummary('017f22e2-79b0-7000-8000-00000000ffff');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sesión no encontrada' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ir al historial' })).toHaveAttribute('href', '/history');
  });

  it('shows the start and end indicators without clinical claims', async () => {
    await renderSummary();
    expect(await screen.findByTestId('summary-heart-rate')).toHaveTextContent('78 → 68 lpm');
    expect(screen.getByText(/no miden el dolor/i)).toBeVisible();
    expect(screen.getByText(/resumen automático pendiente/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Descargar datos (CSV)' })).toBeEnabled();
  });

  it('saves how the person feels after listening', async () => {
    const user = userEvent.setup();
    const store = await renderSummary();
    const save = await screen.findByRole('button', { name: 'Guardar valoración' });
    expect(save).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: '8' }));
    await user.click(save);

    expect(await screen.findByText('4 → 8')).toBeVisible();
    expect(screen.getByText('4 puntos más que al empezar')).toBeVisible();
    expect((await store.get(RECORD.id))?.ratingAfter).toBe(8);
  });
});
