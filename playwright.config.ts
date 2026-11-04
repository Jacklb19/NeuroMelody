import { defineConfig, devices } from '@playwright/test';
import { E2E_ANON_KEY, E2E_API_URL, E2E_SUPABASE_URL } from './e2e/accountServices.ts';
import { PREVIEW_SERVER_PORT } from './ports.config.ts';

/** Loopback address, so the preview is reachable only from this machine. */
const E2E_HOST = '127.0.0.1';
/** Accepted range for E2E_PORT: unprivileged TCP ports. */
const MIN_PORT = 1024;
const MAX_PORT = 65535;
/** The audio check (RNF-01) runs only in its own project; the others skip it. */
const AUDIO_SPEC = /audio\.spec\.ts/;
/** Build of the app the tests open: it points at account services the tests answer themselves. */
const E2E_OUT_DIR = 'dist-e2e';

const port = Number(process.env.E2E_PORT ?? PREVIEW_SERVER_PORT);
if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) throw new Error('Invalid E2E_PORT');
const baseURL = `http://${E2E_HOST}:${String(port)}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    // The production policy only allows the real project; the E2E build points elsewhere on purpose.
    bypassCSP: true,
  },
  projects: [
    { name: 'chrome', testIgnore: AUDIO_SPEC, use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'edge', testIgnore: AUDIO_SPEC, use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'chrome-audio', testMatch: AUDIO_SPEC, use: {
      ...devices['Desktop Chrome'], channel: 'chrome',
    } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js build --outDir ${E2E_OUT_DIR} && node node_modules/vite/bin/vite.js preview --outDir ${E2E_OUT_DIR} --host ${E2E_HOST} --port ${String(port)} --strictPort`,
    // Variables of the process win over any .env file, so a local .env.local never reaches the tests.
    env: { VITE_SUPABASE_URL: E2E_SUPABASE_URL, VITE_SUPABASE_ANON_KEY: E2E_ANON_KEY, VITE_API_BASE_URL: E2E_API_URL },
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
