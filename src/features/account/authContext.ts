import { createContext, useContext } from 'react';
import type { Assurance, AuthService, AuthUser } from './authService';

/** Where the account stands; the screens render one view per kind. */
export type AuthState =
  /**
   * The account service has not answered yet. `sessionExpected` says whether this browser
   * seems to keep a session: only then is it worth holding a screen back until the answer.
   */
  | { readonly kind: 'loading'; readonly sessionExpected: boolean }
  /** This deployment has no account service configured. */
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'signed_out' }
  /** Opened from a recovery link: the person must choose a new password. */
  | { readonly kind: 'recovery'; readonly user: AuthUser }
  | { readonly kind: 'signed_in'; readonly user: AuthUser; readonly assurance: Assurance };

export interface AuthContextValue {
  readonly state: AuthState;
  readonly service: AuthService | null;
  /** Reads the session again, after an action that changes it. */
  readonly refresh: () => Promise<void>;
  /** Leaves recovery mode once the new password is saved. */
  readonly finishRecovery: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Whether the account has two-step verification that this session has not passed yet (aal1 to aal2). */
export function needsSecondFactor(assurance: Assurance): boolean {
  return assurance.current === 'aal1' && assurance.next === 'aal2';
}

/**
 * Whether a screen that depends on who is signed in should hold back: the answer is on its
 * way and somebody probably is. Without a kept session nobody waits (the app works without
 * an account), and the provider stops expecting one after `SESSION_CHECK_TIMEOUT_MS`.
 */
export function isCheckingSession(state: AuthState): boolean {
  return state.kind === 'loading' && state.sessionExpected;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
