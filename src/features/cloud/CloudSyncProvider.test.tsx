import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { AuthContext, type AuthContextValue } from '../account/authContext';
import type { Assurance, AuthService } from '../account/authService';
import { MemorySessionStore } from '../records/sessionStore';
import { SessionStoreContext, useSessionStore } from '../records/sessionStoreContext';
import { sessionRecord } from '../../test/sessionRecords';
import { CloudSyncNotice } from './CloudSyncNotice';
import { CloudSyncProvider } from './CloudSyncProvider';

const { status } = es.cloud;
const API = 'https://api.example.test';
const LOCAL = sessionRecord({ id: '017f22e2-79b0-7000-8000-00000000000a' });

/** Only what syncing asks of the account: a token and the consent stored in the profile. */
function account(assurance: Assurance, consentAt: string | null): AuthContextValue {
  const service = {
    accessToken: () => Promise.resolve('token-1'),
    syncConsent: () => Promise.resolve(consentAt),
  } as Partial<AuthService> as AuthService;
  return {
    state: { kind: 'signed_in', user: { id: 'user-1', email: 'persona@example.test', name: null }, assurance },
    service,
    refresh: () => Promise.resolve(),
    finishRecovery: () => Promise.resolve(),
  };
}

/** Lets a test see whether the store the screens receive ever changes identity. */
function StoreProbe({ seen }: { readonly seen: Set<unknown> }): null {
  seen.add(useSessionStore());
  return null;
}

async function renderSync(auth: AuthContextValue, requests: string[], seen = new Set<unknown>()): Promise<Set<unknown>> {
  const local = new MemorySessionStore();
  await local.save(LOCAL);
  const send: typeof fetch = (input, init) => {
    requests.push(`${init?.method ?? 'GET'} ${input instanceof Request ? input.url : input.toString()}`);
    return Promise.resolve(new Response(JSON.stringify({ sessions: [], created: true }), { status: 200 }));
  };
  render(
    <MemoryRouter>
      <AuthContext value={auth}>
        <SessionStoreContext value={local}>
          <CloudSyncProvider apiBaseUrl={API} fetch={send}>
            <CloudSyncNotice />
            <StoreProbe seen={seen} />
          </CloudSyncProvider>
        </SessionStoreContext>
      </AuthContext>
    </MemoryRouter>,
  );
  return seen;
}

describe('CloudSyncProvider', () => {
  it('syncs by itself with an account, two steps and consent, without swapping the store the screens hold', async () => {
    const requests: string[] = [];
    const seen = await renderSync(account({ current: 'aal2', next: 'aal2' }, '2026-10-07T10:00:00.000Z'), requests);

    expect(await screen.findByText(status.synced)).toBeVisible();
    expect(requests).toEqual([`GET ${API}/v1/sessions`, `POST ${API}/v1/sessions`]);
    expect(seen.size).toBe(1);
  });

  it.each([
    ['without the second step', { current: 'aal1', next: 'aal2' } as const, '2026-10-07T10:00:00.000Z', status.needs_second_factor],
    ['without consent', { current: 'aal2', next: 'aal2' } as const, null, status.needs_consent],
  ])('sends nothing %s and says what is missing', async (_case, assurance, consentAt, sentence) => {
    const requests: string[] = [];
    await renderSync(account(assurance, consentAt), requests);

    expect(await screen.findByText(sentence, { exact: false })).toBeVisible();
    expect(requests).toEqual([]);
  });
});
