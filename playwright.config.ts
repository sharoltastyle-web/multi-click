import { defineConfig, devices } from '@playwright/test';
import { BASE } from './app-base';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  // The public-site smoke test has its own config (playwright.smoke.config.ts).
  testIgnore: /public-smoke\.spec\.ts/,
  fullyParallel: true,
  // IndexedDB in WebKit can be slow when many tests run at once; CI runners have few cores.
  expect: { timeout: 10_000 },
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  // Two production builds (versions A and B) served by e2e/support/staticServer.ts in pwa.spec.ts.
  globalSetup: './e2e/support/buildVersions.ts',
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
  },
  // Tests run against the production build, not the dev server.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
    // Playwright supports service workers in Chromium only; PWA tests are skipped in WebKit.
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] }, testIgnore: [/pwa\.spec\.ts/, /public-smoke\.spec\.ts/] },
  ],
});
