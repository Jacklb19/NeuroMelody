import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthError, type SupabaseClient } from '@supabase/supabase-js';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ROUTE_SEGMENTS, ROUTES } from '../../config/routes';
import { es } from '../../i18n/es';
import { fakeAuthService as fakeService } from '../../test/fakeAuthService';
import { AuthProvider } from './AuthProvider';
import { AccountError, type AuthService, type AuthUser } from './authService';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { RequireSecondStep } from './RequireSecondStep';
import { sessionMayExist, sessionStorageKey } from './sessionHint';
import { createSupabaseAuthService, googleEnabled, toAccountError } from './supabaseAuthService';

const copy = es.account;
/** Typing without a pause between keys: these tests type whole addresses and passwords, and the default pause made them run out of time when the machine was busy. */
const typing = (): ReturnType<typeof userEvent.setup> => userEvent.setup({ delay: null });
const USER: AuthUser = { id: 'user-1', email: 'persona@example.test', name: null };
const PASSWORD = 'una-contraseña-larga';

function renderAt(route: string, service: AuthService, sessionKept = false) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider loadService={() => Promise.resolve(service)} expectSession={() => sessionKept}>
        <Routes>
          <Route path={ROUTE_SEGMENTS.login} element={<LoginPage />} />
          <Route path={ROUTE_SEGMENTS.register} element={<RegisterPage />} />
          <Route element={<RequireSecondStep paths={[ROUTES.app]} />}>
            <Route path={ROUTE_SEGMENTS.app} element={<p>app</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('sign-in screens', () => {
  it('words a rejected password from the dictionary', async () => {
    const user = typing();
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

  it('holds the sign-in form back while a kept session is read, instead of showing it for an instant', async () => {
    let answer: (user: AuthUser) => void = () => undefined;
    const reading = new Promise<AuthUser | null>((resolve) => { answer = resolve; });
    renderAt(ROUTES.login, fakeService({ currentUser: () => reading }, USER, { current: 'aal1', next: 'aal2' }), true);

    expect(await screen.findByText(copy.auth.working)).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: copy.login.pageTitle })).not.toBeInTheDocument();

    answer(USER);
    expect(await screen.findByRole('heading', { name: copy.totp.challengeTitle })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: copy.login.pageTitle })).not.toBeInTheDocument();
  });

  it('asks for the code when a sign-in lands straight in the app, and lets the person sign out instead', async () => {
    // Signing in with Google returns to the app itself, past the sign-in screen.
    const user = userEvent.setup();
    let signedIn = true;
    const signOut = vi.fn(() => {
      signedIn = false;
      return Promise.resolve();
    });
    const service = fakeService({ signOut, currentUser: () => Promise.resolve(signedIn ? USER : null) }, USER, { current: 'aal1', next: 'aal2' });
    renderAt(ROUTES.app, service);

    expect(await screen.findByRole('heading', { name: copy.totp.challengeTitle })).toBeInTheDocument();
    expect(screen.queryByText('app')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: copy.totp.signOutInstead }));
    expect(signOut).toHaveBeenCalledOnce();
    expect(await screen.findByRole('form', { name: copy.login.pageTitle })).toBeInTheDocument();
  });

  it('creates the account only when both passwords match, then enters the app', async () => {
    const user = typing();
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

  it('signs out on this device even when Supabase cannot confirm it', async () => {
    const url = 'https://project.supabase.co';
    const storageKey = sessionStorageKey(url);
    expect(storageKey).toBe('sb-project-auth-token');
    window.localStorage.setItem(storageKey, '{"access_token":"stale"}');
    // What Supabase answers when the session no longer exists on the server: it keeps the stored one.
    const client = { auth: { signOut: () => Promise.resolve({ error: new AuthError('Auth session missing!', 400) }) } };
    const service = createSupabaseAuthService(client as unknown as SupabaseClient, { url, anonKey: 'anon', storageKey });

    await expect(service.signOut()).resolves.toBeUndefined();
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });

  it('expects a session only when one is kept or a sign-in is coming back with its code', () => {
    const url = 'https://project.supabase.co';
    const key = sessionStorageKey(url);
    const storage = (kept: readonly string[]): Pick<Storage, 'getItem'> => ({ getItem: (name) => (kept.includes(name) ? '{}' : null) });
    expect(sessionMayExist(url, storage([]), '')).toBe(false);
    expect(sessionMayExist(url, storage([key]), '')).toBe(true);
    // Coming back from Google: the code is in the address and its secret is still kept.
    expect(sessionMayExist(url, storage([`${key}-code-verifier`]), '?code=abc')).toBe(true);
    // A code in the address that no sign-in of this browser started is not a session on its way.
    expect(sessionMayExist(url, storage([]), '?code=abc')).toBe(false);
    // A deployment without accounts never makes anyone wait.
    expect(sessionMayExist(null, storage([key]), '?code=abc')).toBe(false);
  });

  it('reads Google as enabled only when the project settings say so', () => {
    expect(googleEnabled({ external: { google: true } })).toBe(true);
    expect(googleEnabled({ external: { google: false } })).toBe(false);
    expect(googleEnabled({ external: {} })).toBe(false);
    expect(googleEnabled(null)).toBe(false);
  });
});
