import { Navigate, useLocation } from 'react-router';
import { useWarningsRegistry } from './warningsContext';

/** Requires the warnings to be accepted before rendering its content (RF-17). */
export function RequireWarnings({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const registry = useWarningsRegistry();
  const { pathname, search } = useLocation();
  if (!registry.isAccepted()) {
    return <Navigate to="/warnings" replace state={{ from: `${pathname}${search}` }} />;
  }
  return <>{children}</>;
}
