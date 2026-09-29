import { Navigate, useLocation } from 'react-router';
import { useWarningsRegistry } from './warningsContext';

/** Exige la aceptación de las advertencias antes de mostrar su contenido (RF-17). */
export function RequireWarnings({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const registry = useWarningsRegistry();
  const { pathname, search } = useLocation();
  if (!registry.isAccepted()) {
    return <Navigate to="/advertencias" replace state={{ from: `${pathname}${search}` }} />;
  }
  return <>{children}</>;
}
