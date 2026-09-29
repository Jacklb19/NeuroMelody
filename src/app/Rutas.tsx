import { Navigate, Route, Routes } from 'react-router';
import { PaginaAdvertencias } from '../features/advertencias/PaginaAdvertencias';
import { RequiereAdvertencias } from '../features/advertencias/RequiereAdvertencias';
import { DiagnosticoPage } from '../features/diagnostico/DiagnosticoPage';
import { PaginaInicio } from '../features/inicio/PaginaInicio';
import { PaginaPlan } from '../features/plan/PaginaPlan';
import { PaginaSesion } from '../features/sesion/PaginaSesion';
import { Marco } from './Marco';

/** Rutas del S3 según docs/pantallas.md (react-router en modo declarativo). */
export function Rutas(): React.JSX.Element {
  return (
    <Routes>
      <Route element={<Marco />}>
        <Route index element={<PaginaInicio />} />
        <Route path="advertencias" element={<PaginaAdvertencias />} />
        <Route path="plan" element={<PaginaPlan />} />
        <Route
          path="sesion"
          element={
            <RequiereAdvertencias>
              <PaginaSesion />
            </RequiereAdvertencias>
          }
        />
        <Route path="diagnostico" element={<DiagnosticoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
