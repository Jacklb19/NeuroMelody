import { BrowserRouter } from 'react-router';
import { AppRoutes } from './app/AppRoutes';
import { AuthProvider } from './features/account/AuthProvider';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
