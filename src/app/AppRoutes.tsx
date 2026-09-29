import { Navigate, Route, Routes } from 'react-router';
import { WarningsPage } from '../features/warnings/WarningsPage';
import { RequireWarnings } from '../features/warnings/RequireWarnings';
import { DiagnosticsPage } from '../features/diagnostics/DiagnosticsPage';
import { HomePage } from '../features/home/HomePage';
import { PlanPage } from '../features/plan/PlanPage';
import { SessionPage } from '../features/session/SessionPage';
import { Layout } from './Layout';

/** Rutas del S3 según docs/pantallas.md (react-router en modo declarativo). */
export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="warnings" element={<WarningsPage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route
          path="session"
          element={
            <RequireWarnings>
              <SessionPage />
            </RequireWarnings>
          }
        />
        <Route path="diagnostics" element={<DiagnosticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
