import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildPwa } from './scripts/pwa/buildPwa.ts';
import { DEV_SERVER_PORT, PREVIEW_SERVER_PORT } from './ports.config.ts';
import deployment from './vercel.json' with { type: 'json' };

// Exercise production security headers locally; dev keeps Vite's live-reload policy.
const productionHeaders: Readonly<Record<string, string>> = Object.fromEntries(deployment.headers.flatMap(rule =>
  rule.headers.map(header => [header.key, header.value]),
));

/**
 * Cross-origin isolation, which SharedArrayBuffer needs. The dev server takes
 * these headers from vercel.json too, so it cannot drift from production.
 */
const ISOLATION_HEADER_NAMES = ['Cross-Origin-Opener-Policy', 'Cross-Origin-Embedder-Policy'];

const isolationHeaders = Object.fromEntries(ISOLATION_HEADER_NAMES.map(name => {
  const value = productionHeaders[name];
  if (value === undefined) throw new Error(`vercel.json must declare the ${name} header.`);
  return [name, value];
}));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), buildPwa()],
  server: {
    port: DEV_SERVER_PORT,
    headers: isolationHeaders,
  },
  preview: {
    port: PREVIEW_SERVER_PORT,
    headers: productionHeaders,
  },
});
