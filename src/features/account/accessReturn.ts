import { ROUTES } from '../../config/routes';

/**
 * Where signing in or creating an account leads back to: the screen that
 * sent the person there, so a plan half chosen or a summary is not left
 * behind. Links to the access screens leave it in the navigation state.
 * Google cannot carry it through its redirect (it returns to the app's
 * start, the address the project allows), so before leaving for Google it
 * waits in this tab's storage for a few minutes.
 */
export interface AccessReturnState {
  readonly from: string;
}

export const ACCESS_RETURN_STORAGE_KEY = 'neuromelody.access-return';

/** How long a return kept for Google stays valid: an abandoned attempt must not redirect a later visit. */
export const ACCESS_RETURN_TTL_MS = 10 * 60 * 1000;

/** Screens that are never a destination after signing in: the access screens themselves and the public landing page. */
const NOT_A_RETURN: readonly string[] = [ROUTES.home, ROUTES.login, ROUTES.register, ROUTES.forgotPassword, ROUTES.resetPassword];

/** Paths that would leave this origin or fool a parser: protocol-relative, backslashes, spaces or control characters. */
const UNSAFE_PATH = /^\/\/|[\\\s\p{Cc}]/u;

export function accessReturnState(from: string): AccessReturnState {
  return { from };
}

/** A path inside this app, or null for anything else: a full address, another origin or an access screen. */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || UNSAFE_PATH.test(value)) return null;
  const pathname = value.split(/[?#]/, 1)[0] ?? value;
  return NOT_A_RETURN.includes(pathname) ? null : value;
}

/** Where to go once signed in: the screen kept in the untyped navigation state, else the app's start. */
export function accessReturnPath(state: unknown): string {
  const from = typeof state === 'object' && state !== null && 'from' in state ? state.from : null;
  return safeReturnPath(from) ?? ROUTES.app;
}

type ReturnStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function tabStorage(): ReturnStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Keeps the return across the Google redirect. The app's start needs nothing kept. */
export function rememberAccessReturn(path: string, now: number = Date.now(), storage: ReturnStorage | null = tabStorage()): void {
  const safe = safeReturnPath(path);
  try {
    if (safe === null || safe === ROUTES.app) storage?.removeItem(ACCESS_RETURN_STORAGE_KEY);
    else storage?.setItem(ACCESS_RETURN_STORAGE_KEY, JSON.stringify({ path: safe, at: now }));
  } catch {
    // Unavailable storage: Google brings the person to the app's start, as before.
  }
}

/** The return kept before Google, while it is fresh and valid. */
export function rememberedAccessReturn(now: number = Date.now(), storage: ReturnStorage | null = tabStorage()): string | null {
  try {
    const kept: unknown = JSON.parse(storage?.getItem(ACCESS_RETURN_STORAGE_KEY) ?? 'null');
    if (typeof kept !== 'object' || kept === null || !('path' in kept) || !('at' in kept) || typeof kept.at !== 'number') return null;
    if (now - kept.at < 0 || now - kept.at > ACCESS_RETURN_TTL_MS) return null;
    return safeReturnPath(kept.path);
  } catch {
    return null;
  }
}

export function forgetAccessReturn(storage: ReturnStorage | null = tabStorage()): void {
  try {
    storage?.removeItem(ACCESS_RETURN_STORAGE_KEY);
  } catch {
    // Nothing kept that could be read either.
  }
}
