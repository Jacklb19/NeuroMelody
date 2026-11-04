import { env } from '../../config/env';

/**
 * Where the browser keeps the session. It is the name Supabase uses by
 * default, written out so the app can tell whether a session is kept before
 * the Supabase client loads, and forget it when the server cannot confirm a
 * sign-out.
 */
export function sessionStorageKey(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split('.')[0] ?? ''}-auth-token`;
}

/** Ending of the name under which Supabase keeps the secret of a sign-in still on its way back. */
export const CODE_VERIFIER_SUFFIX = '-code-verifier';

/** Query parameter with the code Supabase exchanges for a session after Google or an emailed link (PKCE). */
const AUTH_CODE_PARAM = 'code';

/**
 * Whether somebody may be signed in on this browser: a session is kept, or
 * a sign-in is coming back with its code in the address. It reads only what
 * is at hand, so it answers before the account service has loaded. `false`
 * is certain; `true` still has to be confirmed by the service.
 */
export function sessionMayExist(supabaseUrl: string | null, storage: Pick<Storage, 'getItem'>, search: string): boolean {
  if (supabaseUrl === null) return false;
  const key = sessionStorageKey(supabaseUrl);
  if (storage.getItem(key) !== null) return true;
  return new URLSearchParams(search).has(AUTH_CODE_PARAM) && storage.getItem(`${key}${CODE_VERIFIER_SUFFIX}`) !== null;
}

/** Ending Supabase adds to the kept secret when the code on its way back comes from a password recovery link. */
const RECOVERY_VERIFIER_MARK = '/PASSWORD_RECOVERY';

/**
 * Whether this page was opened from a password recovery link. Under PKCE
 * Supabase announces that landing only as a sign-in, so the app reads it
 * from the code in the address and the kept secret, which Supabase marks
 * for recovery, before the client exchanges and forgets them.
 */
export function openedFromRecoveryLink(supabaseUrl: string | null, storage: Pick<Storage, 'getItem'>, search: string): boolean {
  if (supabaseUrl === null || !new URLSearchParams(search).has(AUTH_CODE_PARAM)) return false;
  const kept = storage.getItem(`${sessionStorageKey(supabaseUrl)}${CODE_VERIFIER_SUFFIX}`);
  return kept?.includes(RECOVERY_VERIFIER_MARK) ?? false;
}

/** Remembers, across reloads and tabs, that a recovery link's session still waits for its new password. */
export interface RecoveryMarker {
  readonly kept: () => boolean;
  readonly keep: () => void;
  readonly forget: () => void;
}

const RECOVERY_PENDING_KEY = 'neuromelody-recovery-pending';

/** `RecoveryMarker` in this browser's storage; without storage nothing is remembered. */
export const recoveryMarkerHere: RecoveryMarker = {
  kept: () => {
    try {
      return window.localStorage.getItem(RECOVERY_PENDING_KEY) !== null;
    } catch {
      return false;
    }
  },
  keep: () => {
    try {
      window.localStorage.setItem(RECOVERY_PENDING_KEY, '1');
    } catch {
      // Without storage a reload of the new password screen asks for a new link.
    }
  },
  forget: () => {
    try {
      window.localStorage.removeItem(RECOVERY_PENDING_KEY);
    } catch {
      // Nothing was kept.
    }
  },
};

/** `openedFromRecoveryLink` for this deployment and this page. */
export function openedFromRecoveryLinkHere(): boolean {
  try {
    return openedFromRecoveryLink(env.supabaseUrl, window.localStorage, window.location.search);
  } catch {
    return false;
  }
}

/** `sessionMayExist` for this deployment and this page. Without storage nothing is kept, so nobody is expected. */
export function sessionMayExistHere(): boolean {
  try {
    return sessionMayExist(env.supabaseUrl, window.localStorage, window.location.search);
  } catch {
    return false;
  }
}
