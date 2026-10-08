import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthError } from '@supabase/supabase-js';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ROUTES } from '../../config/routes';
import { es } from '../../i18n/es';
import { AccountPage } from './AccountPage';
import { AccountError, type Assurance, type AuthService, type AuthUser } from './authService';
import { AuthProvider } from './AuthProvider';
import { MIN_PASSWORD_LENGTH } from './config';
import { toAccountError } from './supabaseAuthService';

const copy = es.account;
const USER: AuthUser = { id: 'user-1', email: 'persona@example.test' };

function fakeService(overrides: Partial<AuthService> = {}, user: AuthUser | null = null, assurance: Assurance = { current: 'aal1', next: 'aal1' }): AuthService {
  return {
    currentUser: () => Promise.resolve(user),
    onChange: () => () => undefined,
    signUp: () => Promise.resolve(),
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
    requestPasswordReset: () => Promise.resolve(),
    updatePassword: () => Promise.resolve(),
    assurance: () => Promise.resolve(assurance),
    listTotpFactors: () => Promise.resolve([{ id: 'phone', name: null, createdAt: '2026-10-07T10:00:00Z' }]),
    enrollTotp: () => Promise.reject(new AccountError('unknown')),
    verifyTotp: () => Promise.resolve(),
    removeTotp: () => Promise.resolve(),
    ...overrides,
  };
}

function renderAccount(service: AuthService | null) {
  render(
    <MemoryRouter initialEntries={[ROUTES.account]}>
      <AuthProvider loadService={() => Promise.resolve(service)}>
        <AccountPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AccountPage', () => {
  it('explains that accounts are off when the deployment has no Supabase settings', async () => {
    renderAccount(null);
    expect(await screen.findByText(copy.unavailable)).toBeInTheDocument();
  });

  it('signs in and words a rejected password from the dictionary', async () => {
    const user = userEvent.setup();
    const signIn = vi.fn(() => Promise.reject(new AccountError('invalid_credentials')));
    renderAccount(fakeService({ signIn }));

    await user.type(await screen.findByLabelText(copy.email), USER.email);
    await user.type(screen.getByLabelText(copy.password), 'una-contraseña');
    await user.click(within(screen.getByRole('form', { name: copy.forms.signIn })).getByRole('button', { name: copy.submit.signIn }));

    expect(signIn).toHaveBeenCalledWith(USER.email, 'una-contraseña');
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.errors.invalid_credentials);
  });

  it('asks for the second factor before showing the account (aal1 → aal2)', async () => {
    renderAccount(fakeService({}, USER, { current: 'aal1', next: 'aal2' }));
    expect(await screen.findByRole('heading', { name: copy.totp.challengeTitle })).toBeInTheDocument();
    expect(screen.queryByText(USER.email)).not.toBeInTheDocument();
  });

  it('rejects a short password before calling the server', async () => {
    const user = userEvent.setup();
    const signUp = vi.fn(() => Promise.resolve());
    renderAccount(fakeService({ signUp }));

    await user.click(await screen.findByRole('button', { name: copy.forms.signUp }));
    await user.type(screen.getByLabelText(copy.email), USER.email);
    await user.type(screen.getByLabelText(copy.password), 'corta');
    await user.click(within(screen.getByRole('form', { name: copy.forms.signUp })).getByRole('button', { name: copy.submit.signUp }));

    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(copy.passwordTooShort(MIN_PASSWORD_LENGTH));
  });
});

describe('toAccountError', () => {
  it('maps Supabase codes and never keeps the server text', () => {
    const error = toAccountError(new AuthError('Invalid login credentials', 400, 'invalid_credentials'));
    expect(error.code).toBe('invalid_credentials');
    expect(error.message).not.toContain('Invalid login');
    expect(toAccountError(new AuthError('?', 500, 'something_new')).code).toBe('unknown');
  });
});
