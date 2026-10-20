import { expect, test } from '@playwright/test';
import { BASE } from '../app-base';

// Runs only against the published site: SMOKE_URL=https://<owner>.github.io/<repo>/ npm run test:smoke
// Optional EXPECTED_BUILD: the commit that should be live. Reads only; never creates profiles.
const SMOKE_URL = process.env.SMOKE_URL;
const EXPECTED_BUILD = process.env.EXPECTED_BUILD;
test.skip(!SMOKE_URL, 'SMOKE_URL is not set');

const READY = 'האפליקציה מוכנה לשימוש גם בלי אינטרנט';
const nav = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('navigation').getByRole('link', { name });

test('the published site serves the expected build over HTTPS', async ({ request }) => {
  expect(new URL(SMOKE_URL!).protocol).toBe('https:');
  expect(new URL(SMOKE_URL!).pathname).toBe(BASE);
  test.skip(!EXPECTED_BUILD, 'EXPECTED_BUILD is not set');
  // Pages may serve a cached index.html for a few minutes after deploying; a query bypasses it.
  await expect
    .poll(
      async () => {
        const html = await (await request.get(`${SMOKE_URL}?smoke=${Date.now()}`)).text();
        return /<meta name="app-build" content="([^"]*)"/.exec(html)?.[1];
      },
      { timeout: 300_000, intervals: [10_000] },
    )
    .toBe(EXPECTED_BUILD);
});

test('screens, assets, manifest and service worker work from the public address', async ({ page, request }) => {
  const failed: string[] = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
  });

  await page.goto('./');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.getByRole('heading', { level: 1, name: 'כפל בכיף' })).toBeVisible();
  await expect(page.getByText(READY)).toBeVisible({ timeout: 30_000 });

  for (const [route, heading] of [
    ['#/about', 'אודות כפל בכיף'],
    ['#/home', 'כפל בכיף'],
  ]) {
    await page.goto(route);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
  // Learn without a profile returns home (no profile is created on the public site).
  await page.goto('#/learn');
  await expect(page).toHaveURL(/#\/home$/);

  await expect
    .poll(() => page.evaluate(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0)))
    .toBe(true);

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(new URL(manifestHref!, page.url()).href)).json();
  expect(manifest).toMatchObject({ start_url: BASE, scope: BASE, id: BASE, display: 'standalone' });
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await request.get(new URL(icon.src, page.url()).href)).status(), icon.src).toBe(200);
  }

  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe(BASE);
  expect(failed).toEqual([]);

  // Offline after preparation: all three screens still open.
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'כפל בכיף' })).toBeVisible();
  await nav(page, 'אודות').click();
  await expect(page.getByRole('table', { name: 'לוח הכפל 1–10' })).toBeVisible();
  await nav(page, 'בית').click();
  await expect(page.getByLabel('כינוי')).toBeVisible();
});
