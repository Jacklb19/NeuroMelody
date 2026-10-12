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

/** `sessionMayExist` for this deployment and this page. Without storage nothing is kept, so nobody is expected. */
export function sessionMayExistHere(): boolean {
  try {
    return sessionMayExist(env.supabaseUrl, window.localStorage, window.location.search);
  } catch {
    return false;
  }
}
