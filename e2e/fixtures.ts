import { test as base, type BrowserContext } from '@playwright/test';
import { E2E_API_URL, E2E_SUPABASE_URL } from './accountServices';

/** Name under which Supabase keeps the session for `E2E_SUPABASE_URL` (see `sessionStorageKey`). */
const SESSION_KEY = 'sb-localhost-auth-token';
const SESSION_LIFETIME_S = 24 * 60 * 60;

const base64Url = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');

/** A signed-in person without two-step verification. The browser only decodes the token, never checks it. */
function fakeSession(): object {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_LIFETIME_S;
  const user = {
    id: 'e2e-user',
    email: 'persona@example.test',
    aud: 'authenticated',
    role: 'authenticated',
    user_metadata: {},
    app_metadata: { provider: 'email', providers: ['email'] },
    identities: [{ provider: 'email' }],
    factors: [],
  };
  const payload = { sub: user.id, role: 'authenticated', aal: 'aal1', amr: [{ method: 'password', timestamp: issuedAt }], iat: issuedAt, exp: expiresAt };
  return {
    access_token: `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.e2e`,
    refresh_token: 'e2e-refresh',
    token_type: 'bearer',
    expires_in: SESSION_LIFETIME_S,
    expires_at: expiresAt,
    user,
  };
}

/** Signs the context in before any page loads and answers the account services it calls. */
export async function signIn(context: BrowserContext): Promise<void> {
  const session = fakeSession();
  await context.addInitScript(([key, value]) => { window.localStorage.setItem(key, value); }, [SESSION_KEY, JSON.stringify(session)] as const);
  await context.route(`${E2E_SUPABASE_URL}/**`, async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/auth/v1/user') return route.fulfill({ json: (session as { user: object }).user });
    if (pathname === '/auth/v1/settings') return route.fulfill({ json: { external: { google: false } } });
    if (pathname === '/auth/v1/factors') return route.fulfill({ json: [] });
    if (pathname.startsWith('/rest/v1/')) return route.fulfill({ json: null });
    return route.fulfill({ status: 404, json: {} });
  });
  await context.route(`${E2E_API_URL}/**`, (route) => route.fulfill({ status: 404, json: { code: 'not_found' } }));
}

/** The app needs an account (ADR-57): every test starts signed in. */
export const test = base.extend<{ signedIn: undefined }>({
  signedIn: [async ({ context }, use) => {
    await signIn(context);
    await use(undefined);
  }, { auto: true }],
});

export { expect, type Page, type TestInfo } from '@playwright/test';
