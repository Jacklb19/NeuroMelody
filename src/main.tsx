import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerServiceWorker } from './app/registerServiceWorker';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No se encontró el elemento raíz (#root) en el documento.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD) {
  void registerServiceWorker().catch((error: unknown) => {
    console.error('No se pudo preparar el funcionamiento sin conexión.', error);
  });
}
