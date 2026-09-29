import { BrowserRouter } from 'react-router';
import { Rutas } from './app/AppRoutes';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Rutas />
    </BrowserRouter>
  );
}

export default App;
