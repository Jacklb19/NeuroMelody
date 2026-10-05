/** Registers only the production worker; failures leave the online app usable. */
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  }
}
