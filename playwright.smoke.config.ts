import { defineConfig, devices } from '@playwright/test';

// Read-only smoke test of the published site. Run with SMOKE_URL set (see e2e/public-smoke.spec.ts).
export default defineConfig({
  testDir: './e2e',
  testMatch: /public-smoke\.spec\.ts/,
  reporter: 'list',
  retries: 1,
  use: { baseURL: process.env.SMOKE_URL },
  projects: [{ name: 'chromium-mobile', use: { ...devices['Pixel 7'] } }],
});
