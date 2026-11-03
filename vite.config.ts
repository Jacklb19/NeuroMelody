import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildPwa } from './scripts/pwa/buildPwa.ts';
import { staticShell } from './scripts/pwa/staticShell.ts';
import { DEV_SERVER_PORT, PREVIEW_SERVER_PORT } from './ports.config.ts';
import deployment from './vercel.json' with { type: 'json' };

// Exercise production security headers locally; dev keeps Vite's live-reload policy.
const productionHeaders: Readonly<Record<string, string>> = Object.fromEntries(deployment.headers.flatMap(rule =>
  rule.headers.map(header => [header.key, header.value]),
));

/**
 * Cross-origin isolation, which SharedArrayBuffer needs, and the browser
 * features the app may use (the camera, never the microphone; Bluetooth keeps
 * its default). The dev server takes these headers from vercel.json too, so
 * it cannot drift from production.
 */
const DEV_HEADER_NAMES = ['Cross-Origin-Opener-Policy', 'Cross-Origin-Embedder-Policy', 'Permissions-Policy'];

const devHeaders = Object.fromEntries(DEV_HEADER_NAMES.map(name => {
  const value = productionHeaders[name];
  if (value === undefined) throw new Error(`vercel.json must declare the ${name} header.`);
  return [name, value];
}));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), staticShell(), buildPwa()],
  server: {
    port: DEV_SERVER_PORT,
    headers: devHeaders,
  },
  preview: {
    port: PREVIEW_SERVER_PORT,
    headers: productionHeaders,
  },
});
