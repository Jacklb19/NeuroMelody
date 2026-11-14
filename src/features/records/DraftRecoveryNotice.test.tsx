import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { sessionRecord } from '../../test/sessionRecords';
import { AuthContext, type AuthContextValue } from '../account/authContext';
import { DraftRecoveryNotice } from './DraftRecoveryNotice';
import { draftOf } from './sessionDraft';
import { SessionDraftContext } from './sessionDraftContext';
import { MemorySessionDraftStore } from './sessionDraftStore';
import { MemorySessionStore } from './sessionStore';
import { SessionStoreContext } from './sessionStoreContext';

const copy = es.records.draftRecovery;
const RECORD = sessionRecord({ id: '017f22e2-79b0-7000-8000-0000000000d1', listenedSeconds: 720 });

function signedIn(id: string): AuthContextValue {
  return {
    state: { kind: 'signed_in', user: { id, email: 'persona@example.test', name: null }, assurance: { current: 'aal1', next: 'aal1' } },
    service: null,
    refresh: () => Promise.resolve(),
    finishRecovery: () => Promise.resolve(),
  };
}

async function renderNotice(account: string, savedAt = new Date()) {
  const drafts = new MemorySessionDraftStore();
  const store = new MemorySessionStore();
  await drafts.put(draftOf(RECORD, 'user-1', savedAt));
  render(
    <MemoryRouter>
      <AuthContext value={signedIn(account)}>
        <SessionStoreContext value={store}>
          <SessionDraftContext value={drafts}>
            <DraftRecoveryNotice />
          </SessionDraftContext>
        </SessionStoreContext>
      </AuthContext>
    </MemoryRouter>,
  );
  return { drafts, store };
}

describe('DraftRecoveryNotice (ADR-62)', () => {
  it('offers the account that started the session to save what it heard, once', async () => {
    const user = userEvent.setup();
    const { drafts, store } = await renderNotice('user-1');

    expect(await screen.findByRole('heading', { name: copy.title })).toBeVisible();
    expect(screen.getByText(/12 min/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: copy.save }));

    expect(await screen.findByText(copy.saved, { exact: false })).toBeVisible();
    expect(await store.get(RECORD.id)).toEqual({ ...RECORD, ownerId: 'user-1' });
    expect(await drafts.list()).toEqual([]);
  });

  it('never offers it to another account of the device, nor removes it', async () => {
    const { drafts } = await renderNotice('user-2');
    await waitFor(async () => { expect(await drafts.list()).toHaveLength(1); });
    expect(screen.queryByRole('heading', { name: copy.title })).not.toBeInTheDocument();
  });

  it('discards the draft when the person says so', async () => {
    const user = userEvent.setup();
    const { drafts, store } = await renderNotice('user-1');

    await user.click(await screen.findByRole('button', { name: copy.discard }));

    await waitFor(() => { expect(screen.queryByRole('heading', { name: copy.title })).not.toBeInTheDocument(); });
    expect(await drafts.list()).toEqual([]);
    expect(await store.list()).toEqual([]);
  });

  it('removes without asking a draft older than 24 hours', async () => {
    const { drafts } = await renderNotice('user-1', new Date(Date.now() - 25 * 60 * 60 * 1000));
    await waitFor(async () => { expect(await drafts.list()).toEqual([]); });
    expect(screen.queryByRole('heading', { name: copy.title })).not.toBeInTheDocument();
  });
});
