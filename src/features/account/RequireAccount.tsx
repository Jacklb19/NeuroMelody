import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { accessReturnState, forgetAccessReturn, rememberedAccessReturn } from './accessReturn';
import { needsSecondFactor, useAuth } from './authContext';
import { AuthLayout } from './AuthLayout';
import './account.css';

/**
 * The app is only for signed-in people (ADR-57). Every screen of the app
 * stands below this guard: whoever is not signed in goes to the sign-in
 * screen, which brings them back here afterwards, and whoever has two-step
 * verification goes to its code until this session has passed it.
 *
 * It stands above the app layout: while a kept session is still being read
 * nothing of the app is drawn, not even its header. Once past the code, a
 * sign-in with Google goes on to the screen it was started from
 * (`accessReturn.ts`).
 */
export function RequireAccount(): React.ReactNode {
  const { state } = useAuth();
  const { pathname, search } = useLocation();
  const copy = useMessages().account.auth;
  const toSignIn = <Navigate to={ROUTES.login} state={accessReturnState(`${pathname}${search}`)} replace />;

  if (state.kind === 'unavailable') return <AccountsUnavailable />;
  if (state.kind === 'signed_out') return toSignIn;
  // Without a kept session nobody is on the way: no need to wait for the service.
  if (state.kind === 'loading' && !state.sessionExpected) return toSignIn;
  if (state.kind !== 'signed_in') return <p role="status" className="session-check">{copy.working}</p>;
  if (needsSecondFactor(state.assurance)) return toSignIn;
  const kept = rememberedAccessReturn();
  if (kept !== null) return <ReturnAfterSignIn to={kept} />;
  return <Outlet />;
}

/** Goes on to the screen kept before Google, and forgets it so it is followed once. */
function ReturnAfterSignIn({ to }: { readonly to: string }): React.JSX.Element {
  useEffect(() => { forgetAccessReturn(); }, []);
  return <Navigate to={to} replace />;
}

/** The account service could not be reached (or this build has none): without it the app cannot open. */
function AccountsUnavailable(): React.JSX.Element {
  const copy = useMessages().account.auth;
  return (
    <AuthLayout title={copy.unavailableTitle} subtitle={copy.unavailable}>
      <button type="button" className="pill-button pill-button-primary pill-button-block pill-button-large" onClick={() => { window.location.reload(); }}>
        {copy.retry}
      </button>
    </AuthLayout>
  );
}
