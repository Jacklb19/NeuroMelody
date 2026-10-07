import { Navigate, useLocation } from 'react-router';
import { ROUTES } from '../../config/routes';
import { warningsReturnState } from './returnPath';
import { useWarningsRegistry } from './warningsContext';

/** Requires the warnings to be accepted before rendering its content (RF-17). */
export function RequireWarnings({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const registry = useWarningsRegistry();
  const { pathname, search } = useLocation();
  if (!registry.isAccepted()) {
    return <Navigate to={ROUTES.warnings} replace state={warningsReturnState(`${pathname}${search}`)} />;
  }
  return <>{children}</>;
}
