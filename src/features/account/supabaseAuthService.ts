import { AuthError, isAuthRetryableFetchError, type SupabaseClient } from '@supabase/supabase-js';
import {
  AccountError,
  type AccountErrorCode,
  type AuthEvent,
  type AuthService,
  type TotpEnrollment,
} from './authService';

/** Supabase error codes, grouped into the few the interface explains. */
const ERROR_CODES: Readonly<Record<string, AccountErrorCode>> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  user_already_exists: 'user_already_exists',
  email_exists: 'user_already_exists',
  weak_password: 'weak_password',
  same_password: 'same_password',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  mfa_verification_failed: 'invalid_code',
  mfa_challenge_expired: 'code_expired',
  too_many_enrolled_mfa_factors: 'too_many_factors',
  session_expired: 'session_expired',
  session_not_found: 'session_expired',
  refresh_token_not_found: 'session_expired',
};

/** Where the sync consent lives (ADR-18): the person's own row, protected by row level security. */
const PROFILES_TABLE = 'profiles';
const CONSENT_COLUMN = 'sync_consent_at';

/** Prefix Supabase leaves off some QR codes; with it the SVG works as an image URL. */
const SVG_DATA_URL_PREFIX = 'data:image/svg+xml;utf-8,';

/** Turns whatever Supabase threw or returned into an `AccountError`, never leaking its text. */
export function toAccountError(error: unknown): AccountError {
  if (error instanceof AccountError) return error;
  if (isAuthRetryableFetchError(error)) return new AccountError('network');
  if (error instanceof AuthError) return new AccountError(ERROR_CODES[error.code ?? ''] ?? 'unknown');
  if (error instanceof TypeError) return new AccountError('network');
  return new AccountError('unknown');
}

type SupabaseResult = { data: unknown; error: AuthError | null };
/** The data of the successful branch of a Supabase answer. */
type SuccessData<R extends SupabaseResult> = NonNullable<Extract<R, { error: null }>["data"]>;

/** Supabase answers `{ data, error }`; this throws the error and returns the data. */
function unwrap<R extends SupabaseResult>(result: R): SuccessData<R> {
  if (result.error !== null) throw toAccountError(result.error);
  // Without an error, Supabase always fills `data` with the success shape.
  return result.data as SuccessData<R>;
}

async function attempt<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw toAccountError(error);
  }
}

const EVENTS: Readonly<Record<string, AuthEvent>> = {
  SIGNED_IN: 'signed_in',
  SIGNED_OUT: 'signed_out',
  PASSWORD_RECOVERY: 'password_recovery',
  USER_UPDATED: 'updated',
  MFA_CHALLENGE_VERIFIED: 'updated',
  TOKEN_REFRESHED: 'updated',
};

/** Public settings of the Supabase project, read to know which sign-in methods are on. */
export interface ProjectAccess {
  readonly url: string;
  readonly anonKey: string;
  /** Name under which the browser keeps the session (see `sessionStorageKey`). */
  readonly storageKey: string;
}

/** What Supabase stores next to the session, by the ending of its storage name. */
const SESSION_STORAGE_SUFFIXES = ['', '-code-verifier', '-user'];

/** Forgets the session kept in this browser, without asking the server. */
function forgetStoredSession(storageKey: string): void {
  try {
    for (const suffix of SESSION_STORAGE_SUFFIXES) window.localStorage.removeItem(`${storageKey}${suffix}`);
  } catch {
    // Without storage there is no session kept to forget.
  }
}

/** Whether the project settings say Google sign-in is enabled; any doubt reads as "no". */
export function googleEnabled(settings: unknown): boolean {
  if (typeof settings !== 'object' || settings === null || !('external' in settings)) return false;
  const external = settings.external;
  return typeof external === 'object' && external !== null && 'google' in external && external.google === true;
}

/** `AuthService` over Supabase Auth: email and password, Google, recovery and TOTP. */
export function createSupabaseAuthService(client: SupabaseClient, project: ProjectAccess): AuthService {
  const { auth } = client;
  return {
    currentUser: () => attempt(async () => {
      const { session } = unwrap(await auth.getSession());
      const user = session?.user;
      if (user?.email === undefined) return null;
      const name: unknown = user.user_metadata.full_name;
      return { id: user.id, email: user.email, name: typeof name === 'string' && name.trim() !== '' ? name : null };
    }),
    onChange(listener) {
      const { data } = auth.onAuthStateChange((event) => {
        const mapped = EVENTS[event];
        // Supabase's callbacks run inside its lock; deferring avoids calling back into it from there.
        if (mapped !== undefined) setTimeout(() => { listener(mapped); }, 0);
      });
      return () => { data.subscription.unsubscribe(); };
    },
    signUp: (email, password) => attempt(async () => {
      const { session } = unwrap(await auth.signUp({ email, password }));
      // No session means the project still asks to confirm the email first.
      return session === null ? 'confirmation_required' : 'signed_in';
    }),
    googleAvailable: async () => {
      try {
        const response = await fetch(`${project.url}/auth/v1/settings`, { headers: { apikey: project.anonKey } });
        return response.ok && googleEnabled(await response.json());
      } catch {
        return false;
      }
    },
    signInWithGoogle: (returnUrl) => attempt(async () => {
      unwrap(await auth.signInWithOAuth({ provider: 'google', options: { redirectTo: returnUrl } }));
    }),
    signIn: (email, password) => attempt(async () => {
      unwrap(await auth.signInWithPassword({ email, password }));
    }),
    // Signing out must always work on this device. When the server cannot confirm it (the
    // session may no longer exist there: adding two-step verification closes the sessions
    // of the other devices), Supabase keeps the session stored, and the person would stay
    // signed in with no way out. The stored session is then forgotten here.
    signOut: async () => {
      try {
        const { error } = await auth.signOut();
        if (error === null) return;
      } catch {
        // Handled below, like an error returned by Supabase.
      }
      forgetStoredSession(project.storageKey);
    },
    requestPasswordReset: (email, resetUrl) => attempt(async () => {
      unwrap(await auth.resetPasswordForEmail(email, { redirectTo: resetUrl }));
    }),
    updatePassword: (password) => attempt(async () => {
      unwrap(await auth.updateUser({ password }));
    }),
    assurance: () => attempt(async () => {
      const { currentLevel, nextLevel } = unwrap(await auth.mfa.getAuthenticatorAssuranceLevel());
      return { current: currentLevel === 'aal2' ? 'aal2' : 'aal1', next: nextLevel === 'aal2' ? 'aal2' : 'aal1' };
    }),
    listTotpFactors: () => attempt(async () => {
      const { totp } = unwrap(await auth.mfa.listFactors());
      return totp.map((factor) => ({ id: factor.id, name: factor.friendly_name ?? null, createdAt: factor.created_at }));
    }),
    enrollTotp: (name) => attempt(async (): Promise<TotpEnrollment> => {
      // An abandoned enrollment stays unverified and would block a new one with the same name.
      const { all } = unwrap(await auth.mfa.listFactors());
      for (const factor of all) {
        if (factor.status === 'unverified') unwrap(await auth.mfa.unenroll({ factorId: factor.id }));
      }
      const data = unwrap(await auth.mfa.enroll({ factorType: 'totp', friendlyName: name }));
      const qr = data.totp.qr_code;
      return { factorId: data.id, qrCodeUrl: qr.startsWith('data:') ? qr : SVG_DATA_URL_PREFIX + qr, secret: data.totp.secret };
    }),
    verifyTotp: (factorId, code) => attempt(async () => {
      unwrap(await auth.mfa.challengeAndVerify({ factorId, code }));
    }),
    removeTotp: (factorId) => attempt(async () => {
      unwrap(await auth.mfa.unenroll({ factorId }));
    }),
    accessToken: () => attempt(async () => unwrap(await auth.getSession()).session?.access_token ?? null),
    syncConsent: () => attempt(async () => {
      const userId = unwrap(await auth.getSession()).session?.user.id;
      if (userId === undefined) return null;
      const { data, error } = await client.from(PROFILES_TABLE).select(CONSENT_COLUMN).eq('id', userId).maybeSingle();
      if (error !== null) throw new AccountError('unknown');
      // Row level security only ever returns the person's own profile.
      const stored: unknown = (data as Readonly<Record<string, unknown>> | null)?.[CONSENT_COLUMN];
      return typeof stored === 'string' ? stored : null;
    }),
    setSyncConsent: (givenAt) => attempt(async () => {
      const userId = unwrap(await auth.getSession()).session?.user.id;
      if (userId === undefined) throw new AccountError('session_expired');
      const { error } = await client.from(PROFILES_TABLE).update({ [CONSENT_COLUMN]: givenAt }).eq('id', userId);
      if (error !== null) throw new AccountError('unknown');
    }),
  };
}
