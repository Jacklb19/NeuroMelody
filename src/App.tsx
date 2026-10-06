import { BrowserRouter } from 'react-router';
import { AppRoutes } from './app/AppRoutes';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
