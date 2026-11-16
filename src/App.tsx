import { BrowserRouter } from 'react-router';
import { AppRoutes } from './app/AppRoutes';
import { ScreenErrorBoundary } from './app/ScreenErrorBoundary';
import { PreferencesProvider } from './app/preferences/PreferencesProvider';
import { AuthProvider } from './features/account/AuthProvider';
import { CloudSyncProvider } from './features/cloud/CloudSyncProvider';

export function App(): React.JSX.Element {
  return (
    <PreferencesProvider>
      <BrowserRouter>
        <AuthProvider>
          <CloudSyncProvider>
            {/* Last resort for the screens outside the layout; the layout keeps its own so the header stays. */}
            <ScreenErrorBoundary>
              <AppRoutes />
            </ScreenErrorBoundary>
          </CloudSyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </PreferencesProvider>
  );
}

export default App;
