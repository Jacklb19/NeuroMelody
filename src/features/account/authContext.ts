import { createContext, useContext } from 'react';
import type { Assurance, AuthService, AuthUser } from './authService';

/** Where the account stands; the screens render one view per kind. */
export type AuthState =
  | { readonly kind: 'loading' }
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

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
