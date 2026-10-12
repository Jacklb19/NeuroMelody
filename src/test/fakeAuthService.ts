import { AccountError, type Assurance, type AuthService, type AuthUser } from '../features/account/authService';

/** An account service that answers at once: signed out unless a user is given, with one authenticator. */
export function fakeAuthService(
  overrides: Partial<AuthService> = {},
  user: AuthUser | null = null,
  assurance: Assurance = { current: 'aal1', next: 'aal1' },
): AuthService {
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
    accessToken: () => Promise.resolve(null),
    syncConsent: () => Promise.resolve(null),
    setSyncConsent: () => Promise.resolve(),
    ...overrides,
  };
}
