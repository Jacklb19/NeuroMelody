import { BrowserRouter } from 'react-router';
import { AppRoutes } from './app/AppRoutes';
import { PreferencesProvider } from './app/preferences/PreferencesProvider';
import { AuthProvider } from './features/account/AuthProvider';

export function App(): React.JSX.Element {
  return (
    <PreferencesProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </PreferencesProvider>
  );
}

export default App;
