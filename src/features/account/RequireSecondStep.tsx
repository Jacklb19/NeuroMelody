import { Navigate } from 'react-router';
import { ROUTES } from '../../config/routes';
import { needsSecondFactor, useAuth } from './authContext';

/**
 * Sends a person whose account has two-step verification, and who has not
 * entered the code in this session, to the sign-in screen that asks for it.
 * Signing in with Google comes back straight into the app, so without this
 * the code would never be asked. That screen also lets them sign out and
 * keep listening without an account.
 */
export function RequireSecondStep({ children }: { readonly children: React.ReactNode }): React.ReactNode {
  const { state } = useAuth();
  if (state.kind === 'signed_in' && needsSecondFactor(state.assurance)) return <Navigate to={ROUTES.login} replace />;
  return children;
}
