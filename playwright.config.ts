import { defineConfig, devices } from '@playwright/test';
import { PREVIEW_SERVER_PORT } from './ports.config.ts';

/** Loopback address, so the preview is reachable only from this machine. */
const E2E_HOST = '127.0.0.1';
/** Accepted range for E2E_PORT: unprivileged TCP ports. */
const MIN_PORT = 1024;
const MAX_PORT = 65535;
/** The audio check (RNF-01) runs only in its own project; the others skip it. */
const AUDIO_SPEC = /audio\.spec\.ts/;

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
  },
  projects: [
    { name: 'chrome', testIgnore: AUDIO_SPEC, use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'edge', testIgnore: AUDIO_SPEC, use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'chrome-audio', testMatch: AUDIO_SPEC, use: {
      ...devices['Desktop Chrome'], channel: 'chrome',
    } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js preview --host ${E2E_HOST} --port ${String(port)} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
