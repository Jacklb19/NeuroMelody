import { matchPath, Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { isCheckingSession, needsSecondFactor, useAuth } from './authContext';
import './account.css';

interface RequireSecondStepProps {
  /** Routes that ask for the code; the others below this one render as they are. */
  readonly paths: readonly string[];
}

/**
 * Sends a person whose account has two-step verification, and who has not
 * entered the code in this session, to the sign-in screen that asks for it.
 * Signing in with Google comes back straight into the app, so without this
 * the code would never be asked. That screen also lets them sign out and
 * keep listening without an account.
 *
 * It stands above the app layout: while a kept session is still being read
 * nothing of the app is drawn, not even its header, so the app never shows
 * for an instant before the code. Whoever keeps no session is not held back.
 */
export function RequireSecondStep({ paths }: RequireSecondStepProps): React.ReactNode {
  const { state } = useAuth();
  const { pathname } = useLocation();
  const working = useMessages().account.auth.working;
  if (!paths.some((path) => matchPath({ path, end: true }, pathname) !== null)) return <Outlet />;
  if (isCheckingSession(state)) return <p role="status" className="session-check">{working}</p>;
  if (state.kind === 'signed_in' && needsSecondFactor(state.assurance)) return <Navigate to={ROUTES.login} replace />;
  return <Outlet />;
}
