import { BrowserRouter } from 'react-router';
import { AppRoutes } from './app/AppRoutes';
import { PreferencesProvider } from './app/preferences/PreferencesProvider';
import { AuthProvider } from './features/account/AuthProvider';
import { CloudSyncProvider } from './features/cloud/CloudSyncProvider';

export function App(): React.JSX.Element {
  return (
    <PreferencesProvider>
      <BrowserRouter>
        <AuthProvider>
          <CloudSyncProvider>
            <AppRoutes />
          </CloudSyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </PreferencesProvider>
  );
}

export default App;
