import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { es } from '../../i18n/es';
import { MAX_NOTE_LENGTH } from '../records/sessionContext';
import { sessionRecord } from '../../test/sessionRecords';
import type { SessionRecord } from '../records/sessionRecord';
import { MemorySessionStore, SessionStoreError, type SessionStore } from '../records/sessionStore';
import { SessionStoreContext } from '../records/sessionStoreContext';
import { SessionNote } from './SessionNote';

const copy = es.insights.note;

async function renderNote(record: SessionRecord, store: SessionStore = new MemorySessionStore()): Promise<{ readonly store: SessionStore; readonly onSaved: ReturnType<typeof vi.fn> }> {
  await store.save(record);
  const onSaved = vi.fn();
  render(
    <SessionStoreContext value={store}>
      <SessionNote record={record} onSaved={onSaved} />
    </SessionStoreContext>,
  );
  return { store, onSaved };
}

describe('SessionNote', () => {
  it('saves a note on the device only when it changed, trimmed', async () => {
    const user = userEvent.setup();
    const record = sessionRecord();
    const { store, onSaved } = await renderNote(record);
    const save = screen.getByRole('button', { name: copy.save });
    expect(save).toBeDisabled();
    // Without a note there is nothing to remove.
    expect(screen.queryByRole('button', { name: copy.remove })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(copy.label), '  Un momento tranquilo  ');
    expect(screen.getByText(copy.remaining(24, MAX_NOTE_LENGTH))).toBeInTheDocument();
    await user.click(save);

    expect(await screen.findByText(copy.saved)).toBeInTheDocument();
    expect((await store.get(record.id))?.note).toBe('Un momento tranquilo');
    expect(screen.getByLabelText(copy.label)).toHaveValue('Un momento tranquilo');
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: record.id, note: 'Un momento tranquilo' }));
  });

  it('removes a note that was kept', async () => {
    const user = userEvent.setup();
    const record = sessionRecord({ note: 'Antes de dormir' });
    const { store } = await renderNote(record);
    expect(screen.getByLabelText(copy.label)).toHaveValue('Antes de dormir');

    await user.click(screen.getByRole('button', { name: copy.remove }));

    expect(await screen.findByText(copy.removed)).toBeInTheDocument();
    expect((await store.get(record.id))?.note).toBe('');
  });

  it('says why a note could not be saved and keeps what was written', async () => {
    const user = userEvent.setup();
    const record = sessionRecord();
    const store = new MemorySessionStore();
    vi.spyOn(store, 'setNote').mockRejectedValue(new SessionStoreError('access_failed', 'The device storage refused the write.'));
    await renderNote(record, store);

    await user.type(screen.getByLabelText(copy.label), 'Hoy costó');
    await user.click(screen.getByRole('button', { name: copy.save }));

    expect(await screen.findByRole('alert')).toHaveTextContent(es.records.errors.access_failed);
    expect(screen.getByLabelText(copy.label)).toHaveValue('Hoy costó');
    await waitFor(() => { expect(screen.getByLabelText(copy.label)).toBeEnabled(); });
  });
});
