import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext, type AuthState } from './authContext';
import type { AuthService } from './authService';


type ServiceLoader = () => Promise<AuthService | null>;

const defaultLoader: ServiceLoader = async () => (await import('./loadAuthService')).loadAuthService();

interface AuthProviderProps {
  readonly children: React.ReactNode;
  /** Injectable so tests run without Supabase. */
  readonly loadService?: ServiceLoader;
}

/**
 * Holds the account session for every screen (RF-14). The Supabase client
 * loads after the first render, so the app never waits for it.
 */
export function AuthProvider({ children, loadService = defaultLoader }: AuthProviderProps): React.JSX.Element {
  const [service, setService] = useState<AuthService | null>(null);
  const [state, setState] = useState<AuthState>({ kind: 'loading' });
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
