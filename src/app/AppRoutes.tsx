import { Navigate, Route, Routes } from 'react-router';
import { PaginaAdvertencias } from '../features/warnings/WarningsPage';
import { RequiereAdvertencias } from '../features/warnings/RequireWarnings';
import { DiagnosticoPage } from '../features/diagnostics/DiagnosticsPage';
import { PaginaInicio } from '../features/home/HomePage';
import { PaginaPlan } from '../features/plan/PlanPage';
import { PaginaSesion } from '../features/session/SessionPage';
import { Marco } from './Layout';

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
