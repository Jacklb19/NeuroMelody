import { SERVICE_WORKER_FILE } from '../config/pwa';

/** Registers only the production worker; failures leave the online app usable. */
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.register(`/${SERVICE_WORKER_FILE}`, { updateViaCache: 'none' });
  }
}
