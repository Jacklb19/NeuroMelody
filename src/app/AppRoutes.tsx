import { Navigate, Route, Routes } from 'react-router';
import { ROUTE_SEGMENTS, ROUTES } from '../config/routes';
import { WarningsPage } from '../features/warnings/WarningsPage';
import { RequireWarnings } from '../features/warnings/RequireWarnings';
import { DiagnosticsPage } from '../features/diagnostics/DiagnosticsPage';
import { HomePage } from '../features/home/HomePage';
import { LandingPage } from '../features/landing/LandingPage';
import { AccountPage } from '../features/account/AccountPage';
import { PrivacyPage } from '../features/privacy/PrivacyPage';
import { PlanPage } from '../features/plan/PlanPage';
import { SessionPage } from '../features/session/SessionPage';
import { SessionSummaryPage } from '../features/summary/SessionSummaryPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { Layout } from './Layout';

/** react-router pattern for any path no screen claims; it leads back home. */
const UNKNOWN_PATH = '*';

/** Routes from docs/pantallas.md (react-router in declarative mode). The landing page has its own layout. */
export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route element={<Layout />}>
        <Route path={ROUTE_SEGMENTS.app} element={<HomePage />} />
        <Route path={ROUTE_SEGMENTS.warnings} element={<WarningsPage />} />
        <Route path={ROUTE_SEGMENTS.plan} element={<PlanPage />} />
        <Route
          path={ROUTE_SEGMENTS.session}
          element={
            <RequireWarnings>
              <SessionPage />
            </RequireWarnings>
          }
        />
        <Route path={ROUTE_SEGMENTS.summary} element={<SessionSummaryPage />} />
        <Route path={ROUTE_SEGMENTS.history} element={<HistoryPage />} />
        <Route path={ROUTE_SEGMENTS.diagnostics} element={<DiagnosticsPage />} />
        <Route path={ROUTE_SEGMENTS.account} element={<AccountPage />} />
        <Route path={ROUTE_SEGMENTS.privacy} element={<PrivacyPage />} />
        <Route path={UNKNOWN_PATH} element={<Navigate to={ROUTES.home} replace />} />
      </Route>
    </Routes>
  );
}
