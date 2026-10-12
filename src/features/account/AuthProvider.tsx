import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext, type AuthState } from './authContext';
import type { AuthService } from './authService';
import { SESSION_CHECK_TIMEOUT_MS } from './config';
import { sessionMayExistHere } from './sessionHint';


type ServiceLoader = () => Promise<AuthService | null>;

const defaultLoader: ServiceLoader = async () => (await import('./loadAuthService')).loadAuthService();

interface AuthProviderProps {
  readonly children: React.ReactNode;
  /** Injectable so tests run without Supabase. */
  readonly loadService?: ServiceLoader;
  /** Whether this browser seems to keep a session; injectable for the same reason. */
  readonly expectSession?: () => boolean;
}

/**
 * Holds the account session for every screen (RF-14). The Supabase client
 * loads after the first render. Someone without a kept session never waits
 * for it; with one, the screens that depend on who is signed in hold back
 * until it answers, for a bounded time (`isCheckingSession`).
 */
export function AuthProvider({ children, loadService = defaultLoader, expectSession = sessionMayExistHere }: AuthProviderProps): React.JSX.Element {
  const [service, setService] = useState<AuthService | null>(null);
  const [state, setState] = useState<AuthState>(() => ({ kind: 'loading', sessionExpected: expectSession() }));
  // Recovery lasts until the password changes, whatever session events arrive meanwhile.
  const recoveryRef = useRef(false);

  const read = useCallback(async (target: AuthService): Promise<void> => {
    try {
      const user = await target.currentUser();
      if (user === null) setState({ kind: 'signed_out' });
      else if (recoveryRef.current) setState({ kind: 'recovery', user });
      else setState({ kind: 'signed_in', user, assurance: await target.assurance() });
    } catch {
      // Without a readable session the person can still sign in again.
      setState({ kind: 'signed_out' });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = (): void => undefined;
    void loadService().then((loaded) => {
      if (cancelled) return;
      if (loaded === null) {
        setState({ kind: 'unavailable' });
        return;
      }
      setService(loaded);
      unsubscribe = loaded.onChange((event) => {
        if (event === 'password_recovery') recoveryRef.current = true;
        if (event === 'signed_out') recoveryRef.current = false;
        void read(loaded);
      });
      void read(loaded);
    }, () => { if (!cancelled) setState({ kind: 'unavailable' }); });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [loadService, read]);

  const waiting = state.kind === 'loading' && state.sessionExpected;
  useEffect(() => {
    if (!waiting) return undefined;
    // A service that does not answer (no network, a blocked download) must not leave a blank screen.
    const timer = setTimeout(() => {
      setState((current) => (current.kind === 'loading' ? { kind: 'loading', sessionExpected: false } : current));
    }, SESSION_CHECK_TIMEOUT_MS);
    return () => { clearTimeout(timer); };
  }, [waiting]);

  const refresh = useCallback(async () => {
    if (service !== null) await read(service);
  }, [service, read]);

  const finishRecovery = useCallback(async () => {
    recoveryRef.current = false;
    await refresh();
  }, [refresh]);

  const value = useMemo(() => ({ state, service, refresh, finishRecovery }), [state, service, refresh, finishRecovery]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
