import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerServiceWorker } from './app/registerServiceWorker';
import { IS_PRODUCTION_BUILD } from './config/env';

/** Mount node declared in index.html. */
const ROOT_ELEMENT_ID = 'root';

const container = document.getElementById(ROOT_ELEMENT_ID);

if (!container) {
  throw new Error(`Root element #${ROOT_ELEMENT_ID} is missing from the document.`);
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (IS_PRODUCTION_BUILD) {
  void registerServiceWorker().catch((error: unknown) => {
    console.error('Could not register the service worker; offline mode is unavailable.', error);
  });
}
