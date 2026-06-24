import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config (F17). Boots the full stack (`npm run dev` → Socket.io server on :3001 +
 * Vite client on :5173) and drives multiple browser contexts to simulate several players
 * in one room. Server readiness is implied by the client serving — the tests wait on the
 * live lobby/role-reveal UI, which only renders once the socket round-trips succeed.
 */
const CLIENT_URL = 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: CLIENT_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: CLIENT_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
