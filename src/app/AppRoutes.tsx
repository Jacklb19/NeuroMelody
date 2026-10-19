import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ROUTE_SEGMENTS, ROUTES } from '../config/routes';
import { WarningsPage } from '../features/warnings/WarningsPage';
import { RequireWarnings } from '../features/warnings/RequireWarnings';
import { HomePage } from '../features/home/HomePage';
import { LandingPage } from '../features/landing/LandingPage';
import { ForgotPasswordPage } from '../features/account/ForgotPasswordPage';
import { LoginPage } from '../features/account/LoginPage';
import { RegisterPage } from '../features/account/RegisterPage';
import { RequireSecondStep } from '../features/account/RequireSecondStep';
import { ResetPasswordPage } from '../features/account/ResetPasswordPage';
import { PlanPage } from '../features/plan/PlanPage';
import { Layout } from './Layout';

/*
 * Screens loaded when first visited (RNF-04, RNF-05): the first screen a
 * person sees (portada, inicio, preparar, advertencias y acceso) ships with
 * the app; the rest arrive as separate files, which the service worker keeps
 * for offline use like any other file of the build.
 */
const SessionPage = lazy(() => import('../features/session/SessionPage').then((m) => ({ default: m.SessionPage })));
const SessionSummaryPage = lazy(() => import('../features/summary/SessionSummaryPage').then((m) => ({ default: m.SessionSummaryPage })));
const HistoryPage = lazy(() => import('../features/history/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const ProgressPage = lazy(() => import('../features/progress/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const ReportPage = lazy(() => import('../features/report/ReportPage').then((m) => ({ default: m.ReportPage })));
const CollectionPage = lazy(() => import('../features/collection/CollectionPage').then((m) => ({ default: m.CollectionPage })));
const DiagnosticsPage = lazy(() => import('../features/diagnostics/DiagnosticsPage').then((m) => ({ default: m.DiagnosticsPage })));
const AccountPage = lazy(() => import('../features/account/AccountPage').then((m) => ({ default: m.AccountPage })));
const PrivacyPage = lazy(() => import('../features/privacy/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));

/** react-router pattern for any path no screen claims; it leads back home. */
const UNKNOWN_PATH = '*';

/** Where a sign-in lands (Google comes back here), so where the code of two-step verification is asked. */
const SECOND_STEP_PATHS = [ROUTES.app];

/** Routes from docs/pantallas.md (react-router in declarative mode). The landing page and the sign-in screens have their own layouts. */
export function AppRoutes(): React.JSX.Element {
  // Nothing is drawn for the instant a screen takes to load: its file is usually already cached.
  return (
    <Suspense fallback={null}>
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path={ROUTE_SEGMENTS.login} element={<LoginPage />} />
      <Route path={ROUTE_SEGMENTS.register} element={<RegisterPage />} />
      <Route path={ROUTE_SEGMENTS.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={ROUTE_SEGMENTS.resetPassword} element={<ResetPasswordPage />} />
      {/* The code of two-step verification is asked above the layout, so nothing of the app shows before it. */}
      <Route element={<RequireSecondStep paths={SECOND_STEP_PATHS} />}>
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
          <Route path={ROUTE_SEGMENTS.progress} element={<ProgressPage />} />
          <Route path={ROUTE_SEGMENTS.report} element={<ReportPage />} />
          <Route
            path={ROUTE_SEGMENTS.collect}
            element={
              <RequireWarnings>
                <CollectionPage />
              </RequireWarnings>
            }
          />
          <Route path={ROUTE_SEGMENTS.diagnostics} element={<DiagnosticsPage />} />
          <Route path={ROUTE_SEGMENTS.account} element={<AccountPage />} />
          <Route path={ROUTE_SEGMENTS.privacy} element={<PrivacyPage />} />
          <Route path={UNKNOWN_PATH} element={<Navigate to={ROUTES.home} replace />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
  );
}
