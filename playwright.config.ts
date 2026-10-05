import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid E2E_PORT');
const baseURL = `http://127.0.0.1:${String(port)}`;

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
    { name: 'chrome', testIgnore: /audio\.spec\.ts/, use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'edge', testIgnore: /audio\.spec\.ts/, use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'chrome-audio', testMatch: /audio\.spec\.ts/, use: {
      ...devices['Desktop Chrome'], channel: 'chrome',
    } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${String(port)} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
