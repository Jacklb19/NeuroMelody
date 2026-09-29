import { Navigate, useLocation } from 'react-router';
import { useRegistroAdvertencias } from './warningsContext';

/** Exige la aceptación de las advertencias antes de mostrar su contenido (RF-17). */
export function RequiereAdvertencias({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const registro = useRegistroAdvertencias();
  const { pathname, search } = useLocation();
  if (!registro.aceptadas()) {
    return <Navigate to="/advertencias" replace state={{ desde: `${pathname}${search}` }} />;
  }
  return <>{children}</>;
}
