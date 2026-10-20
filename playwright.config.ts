import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  // Two production builds (versions A and B) served by e2e/support/staticServer.ts in pwa.spec.ts.
  globalSetup: './e2e/support/buildVersions.ts',
  use: {
    baseURL: `http://localhost:${PORT}/`,
  },
  // Tests run against the production build, not the dev server.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
    // Playwright supports service workers in Chromium only; PWA tests are skipped in WebKit.
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] }, testIgnore: /pwa.spec.ts/ },
  ],
});
