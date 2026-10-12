import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../app/preferences/PreferencesProvider';
import { es } from '../../i18n/es';
import { AccountPage } from '../account/AccountPage';
import { AuthContext, type AuthContextValue } from '../account/authContext';
import type { AuthService } from '../account/authService';
import { HistoryPage } from '../history/HistoryPage';
import { PrivacyPage } from '../privacy/PrivacyPage';
import { MemorySessionStore, type SessionStore } from '../records/sessionStore';
import { SessionStoreContext } from '../records/sessionStoreContext';
import { sessionRecord } from '../../test/sessionRecords';
import { CloudError, type CloudApi } from './cloudApi';
import { CloudSyncContext, type CloudSyncValue } from './cloudSyncContext';

/** A signed-in person without two-step verification; `service` only answers what each screen asks. */
function signedIn(service: Partial<AuthService> = {}): AuthContextValue {
  return {
    state: {
      kind: 'signed_in',
      user: { id: 'user-1', email: 'persona@example.test', name: null },
      assurance: { current: 'aal1', next: 'aal1' },
    },
    service: { listTotpFactors: () => Promise.resolve([]), ...service } as AuthService,
    refresh: vi.fn(() => Promise.resolve()),
    finishRecovery: () => Promise.resolve(),
  };
}

function cloud(overrides: Partial<CloudSyncValue> = {}): CloudSyncValue {
  return {
    status: 'synced',
    error: null,
    revision: 0,
    consentAt: null,
    setConsent: () => Promise.resolve(),
    syncNow: () => Promise.resolve(),
    api: null,
    ...overrides,
  };
}

function renderScreen(screenElement: React.ReactNode, auth: AuthContextValue, sync: CloudSyncValue, store: SessionStore = new MemorySessionStore()): void {
  render(
    <PreferencesProvider>
      <MemoryRouter>
        <AuthContext value={auth}>
          <CloudSyncContext value={sync}>
            <SessionStoreContext value={store}>{screenElement}</SessionStoreContext>
          </CloudSyncContext>
        </AuthContext>
      </MemoryRouter>
    </PreferencesProvider>,
  );
}

describe('screens that act on the cloud', () => {
  it('deletes the account only after confirming, then closes the session', async () => {
    const user = userEvent.setup();
    const deleteAccount = vi.fn(() => Promise.resolve());
    const signOut = vi.fn(() => Promise.resolve());
    const auth = signedIn({ signOut });
    const copy = es.account.profile.rows.deleteAccount;
    renderScreen(<AccountPage />, auth, cloud({ api: { deleteAccount } as Partial<CloudApi> as CloudApi }));

    await user.click(await screen.findByRole('button', { name: copy.action }));
    expect(deleteAccount).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: copy.confirm }));

    await vi.waitFor(() => { expect(auth.refresh).toHaveBeenCalled(); });
    expect(deleteAccount).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('keeps the session and says why when the cloud does not confirm a deletion', async () => {
    const user = userEvent.setup();
    const local = new MemorySessionStore();
    await local.save(sessionRecord());
    const store: SessionStore = {
      save: (record) => local.save(record),
      get: (id) => local.get(id),
      list: () => local.list(),
      setRatingAfter: (id, rating) => local.setRatingAfter(id, rating),
      delete: () => Promise.reject(new CloudError('network')),
      clear: () => local.clear(),
    };
    renderScreen(<HistoryPage />, signedIn(), cloud(), store);

    await user.click(await screen.findByRole('button', { name: es.history.item.delete }));
    await user.click(screen.getByRole('button', { name: es.history.item.confirmDelete }));

    expect(await screen.findByRole('alert')).toHaveTextContent(es.cloud.deleteFailed(es.cloud.errors.network));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('records the consent of a signed-in person through the account, and says so when it cannot', async () => {
    const user = userEvent.setup();
    const setConsent = vi.fn((given: boolean) => (given ? Promise.reject(new Error('offline')) : Promise.resolve()));
    renderScreen(<PrivacyPage />, signedIn(), cloud({ setConsent }));

    await user.click(screen.getByRole('checkbox', { name: es.privacy.consent.label }));

    expect(setConsent).toHaveBeenCalledWith(true);
    expect(await screen.findByRole('alert')).toHaveTextContent(es.privacy.consent.saveFailed);
    expect(screen.getByText(es.privacy.consent.stored.account)).toBeVisible();
  });
});
