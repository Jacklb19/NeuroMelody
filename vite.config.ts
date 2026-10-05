import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildPwa } from './scripts/pwa/buildPwa.ts';
import deployment from './vercel.json' with { type: 'json' };

// Exercise production security headers locally; dev keeps Vite's live-reload policy.
const productionHeaders = Object.fromEntries(deployment.headers.flatMap(rule =>
  rule.headers.map(header => [header.key, header.value]),
));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), buildPwa()],
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    port: 4173,
    headers: productionHeaders,
  },
});
