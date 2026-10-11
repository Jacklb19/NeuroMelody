import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthError } from '@supabase/supabase-js';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ROUTE_SEGMENTS, ROUTES } from '../../config/routes';
import { es } from '../../i18n/es';
import { AuthProvider } from './AuthProvider';
import { AccountError, type Assurance, type AuthService, type AuthUser } from './authService';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { googleEnabled, toAccountError } from './supabaseAuthService';

const copy = es.account;
const USER: AuthUser = { id: 'user-1', email: 'persona@example.test', name: null };
const PASSWORD = 'una-contraseña-larga';

function fakeService(overrides: Partial<AuthService> = {}, user: AuthUser | null = null, assurance: Assurance = { current: 'aal1', next: 'aal1' }): AuthService {
  return {
    currentUser: () => Promise.resolve(user),
    onChange: () => () => undefined,
    signUp: () => Promise.resolve('signed_in'),
    googleAvailable: () => Promise.resolve(false),
    signInWithGoogle: () => Promise.resolve(),
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

function renderAt(route: string, service: AuthService) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider loadService={() => Promise.resolve(service)}>
        <Routes>
          <Route path={ROUTE_SEGMENTS.login} element={<LoginPage />} />
          <Route path={ROUTE_SEGMENTS.register} element={<RegisterPage />} />
          <Route path={ROUTE_SEGMENTS.app} element={<p>app</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('sign-in screens', () => {
  it('words a rejected password from the dictionary', async () => {
    const user = userEvent.setup();
    const signIn = vi.fn(() => Promise.reject(new AccountError('invalid_credentials')));
    renderAt(ROUTES.login, fakeService({ signIn }));

    const form = within(await screen.findByRole('form', { name: copy.login.pageTitle }));
    await user.type(form.getByLabelText(copy.auth.email), USER.email);
    await user.type(form.getByLabelText(copy.auth.password), PASSWORD);
    await user.click(form.getByRole('button', { name: copy.login.submit }));

    expect(signIn).toHaveBeenCalledWith(USER.email, PASSWORD);
    expect(await screen.findByText(copy.errors.invalid_credentials)).toBeInTheDocument();
  });

  it('asks for the two-step code before entering the app (aal1 → aal2)', async () => {
    renderAt(ROUTES.login, fakeService({}, USER, { current: 'aal1', next: 'aal2' }));
    expect(await screen.findByRole('heading', { name: copy.totp.challengeTitle })).toBeInTheDocument();
    expect(screen.queryByText('app')).not.toBeInTheDocument();
  });

  it('creates the account only when both passwords match, then enters the app', async () => {
    const user = userEvent.setup();
    const signUp = vi.fn(() => Promise.resolve('signed_in' as const));
    renderAt(ROUTES.register, fakeService({ signUp }));

    const form = within(await screen.findByRole('form', { name: copy.register.pageTitle }));
    await user.type(form.getByLabelText(copy.auth.email), USER.email);
    await user.type(form.getByLabelText(copy.auth.password), PASSWORD);
    await user.type(form.getByLabelText(copy.auth.confirmPassword), 'otra-distinta');
    await user.click(form.getByRole('button', { name: copy.register.submit }));
    expect(signUp).not.toHaveBeenCalled();
    expect(form.getByText(copy.auth.fieldErrors.passwords_differ)).toBeInTheDocument();

    await user.clear(form.getByLabelText(copy.auth.confirmPassword));
    await user.type(form.getByLabelText(copy.auth.confirmPassword), PASSWORD);
    await user.click(form.getByRole('button', { name: copy.register.submit }));
    expect(signUp).toHaveBeenCalledWith(USER.email, PASSWORD);
    expect(await screen.findByText('app')).toBeInTheDocument();
  });

  it('explains that Google is not available instead of leaving the page', async () => {
    const user = userEvent.setup();
    const signInWithGoogle = vi.fn(() => Promise.resolve());
    renderAt(ROUTES.login, fakeService({ signInWithGoogle }));

    await user.click(await screen.findByRole('button', { name: copy.auth.google }));
    expect(await screen.findByText(copy.auth.googleUnavailable)).toBeInTheDocument();
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });
});

describe('Supabase boundary', () => {
  it('maps Supabase codes and never keeps the server text', () => {
    const error = toAccountError(new AuthError('Invalid login credentials', 400, 'invalid_credentials'));
    expect(error.code).toBe('invalid_credentials');
    expect(error.message).not.toContain('Invalid login');
    expect(toAccountError(new AuthError('?', 500, 'something_new')).code).toBe('unknown');
  });

  it('reads Google as enabled only when the project settings say so', () => {
    expect(googleEnabled({ external: { google: true } })).toBe(true);
    expect(googleEnabled({ external: { google: false } })).toBe(false);
    expect(googleEnabled({ external: {} })).toBe(false);
    expect(googleEnabled(null)).toBe(false);
  });
});
