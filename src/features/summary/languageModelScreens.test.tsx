import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '../../config/routes';
import { AuthContext, type AuthState } from '../account/authContext';
import { es } from '../../i18n/es';
import { CloudError, type CloudApi } from '../cloud/cloudApi';
import { CloudSyncContext, type CloudSyncStatus, type CloudSyncValue } from '../cloud/cloudSyncContext';
import { sessionRecord } from '../../test/sessionRecords';
import { AutomaticSummary } from './AutomaticSummary';
import { LEGACY_NARRATIVE_STORAGE_KEY, narrativeStorageKey } from './narrativeCache';

const RECORD = sessionRecord();
/** Someone signed in: automatic texts are kept per account (ADR-61). */
const SIGNED_IN: AuthState = { kind: 'signed_in', user: { id: 'user-1', email: 'persona@example.test', name: null }, assurance: { current: 'aal1', next: 'aal1' } };
const OWN_TEXTS = narrativeStorageKey('user-1');
const SESSION_ID = RECORD.id;
const automatic = es.summary.automatic;

/** What the screens read from the sync provider: a status and, when signed in, the API. */
function cloud(status: CloudSyncStatus, api: Partial<CloudApi> | null): CloudSyncValue {
  return {
    status,
    error: null,
    revision: 0,
    pendingDeletions: 0,
    consentAt: null,
    setConsent: () => Promise.resolve(),
    syncNow: () => Promise.resolve(),
    forgetDeviceCopies: () => Promise.resolve(0),
    forgetAccount: () => Promise.resolve(),
    api: api as CloudApi | null,
  };
}

function renderWith(value: CloudSyncValue, screenUnderTest: React.ReactNode, auth: AuthState = { kind: 'signed_out' }): void {
  render(
    <AuthContext value={{ state: auth, service: null, refresh: () => Promise.resolve(), finishRecovery: () => Promise.resolve() }}>
      <CloudSyncContext value={value}>
        <MemoryRouter>{screenUnderTest}</MemoryRouter>
      </CloudSyncContext>
    </AuthContext>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('automatic summary (RF-15)', () => {
  it('sends nothing until the person agrees, then shows the text as generated and keeps it on the device', async () => {
    const user = userEvent.setup();
    const summarizeSession = vi.fn<CloudApi['summarizeSession']>(() => Promise.resolve({ text: 'Escuchaste 20 minutos.' }));
    // An account is enough: no two-step verification and no session in the cloud.
    renderWith(cloud('needs_second_factor', { summarizeSession }), <AutomaticSummary record={RECORD} />, SIGNED_IN);

    // What travels is said before the button.
    expect(screen.getByText(automatic.notice)).toBeVisible();
    expect(summarizeSession).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: automatic.ask }));

    expect(summarizeSession).toHaveBeenCalledWith(SESSION_ID, 'es', expect.objectContaining({ plannedMinutes: 20, ratingBefore: 4, ratingAfter: 7 }));
    expect(await screen.findByTestId('narrative-text')).toHaveTextContent('Escuchaste 20 minutos.');
    expect(screen.getByText(automatic.generatedMark)).toBeVisible();
    expect(window.localStorage.getItem(OWN_TEXTS)).toContain('Escuchaste 20 minutos.');
  });

  it('shows a summary written earlier without asking again', () => {
    window.localStorage.setItem(OWN_TEXTS, JSON.stringify([
      { sessionId: SESSION_ID, locale: 'es', text: 'Tu pulso pasó de 78 a 68.' },
      { sessionId: SESSION_ID, locale: 'es', text: '' },
      'not an entry',
    ]));
    const summarizeSession = vi.fn<CloudApi['summarizeSession']>();
    renderWith(cloud('needs_second_factor', { summarizeSession }), <AutomaticSummary record={RECORD} />, SIGNED_IN);

    expect(screen.getByTestId('narrative-text')).toHaveTextContent('Tu pulso pasó de 78 a 68.');
    expect(screen.getByText(automatic.generatedMark)).toBeVisible();
    expect(summarizeSession).not.toHaveBeenCalled();
  });

  it('never shows a text another account of this device asked for, nor one kept before texts were per account', () => {
    const text = [{ sessionId: SESSION_ID, locale: 'es', text: 'Texto de otra cuenta.' }];
    window.localStorage.setItem(narrativeStorageKey('user-2'), JSON.stringify(text));
    window.localStorage.setItem(LEGACY_NARRATIVE_STORAGE_KEY, JSON.stringify(text));
    renderWith(cloud('needs_second_factor', { summarizeSession: vi.fn<CloudApi['summarizeSession']>() }), <AutomaticSummary record={RECORD} />, SIGNED_IN);

    expect(screen.queryByTestId('narrative-text')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: automatic.ask })).toBeVisible();
  });

  it('asks only for an account when nobody is signed in', () => {
    renderWith(cloud('signed_out', null), <AutomaticSummary record={RECORD} />);
    expect(screen.getByText(automatic.needsAccount, { exact: false })).toBeVisible();
    expect(screen.getByRole('link', { name: es.cloud.actions.signed_out })).toHaveAttribute('href', ROUTES.login);
    expect(screen.queryByRole('button', { name: automatic.ask })).not.toBeInTheDocument();
  });

  it('says why when the summary could not be written and leaves the way to ask again', async () => {
    const user = userEvent.setup();
    const summarizeSession = (): Promise<never> => Promise.reject(new CloudError('language_model_unavailable'));
    renderWith(cloud('synced', { summarizeSession }), <AutomaticSummary record={RECORD} />);
    await user.click(screen.getByRole('button', { name: automatic.ask }));
    expect(await screen.findByText(automatic.failed(es.cloud.errors.language_model_unavailable))).toBeVisible();
    expect(screen.getByRole('button', { name: automatic.ask })).toBeEnabled();
  });
});
