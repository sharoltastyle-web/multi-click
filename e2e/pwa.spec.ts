import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { createProfile, openNewProfileForm } from './support/profiles';
import { BASE } from '../app-base';
import { PWA_BUILDS_DIR } from './support/buildVersions';
import { TestServer } from './support/staticServer';

// Service workers are only supported by Playwright in Chromium; Safari is checked on a real iPhone.
test.skip(({ browserName }) => browserName !== 'chromium', 'Service workers: Chromium only');
test.use({ serviceWorkers: 'allow' });

const READY = 'האפליקציה מוכנה לשימוש גם בלי אינטרנט';
const NEEDS_CONNECTION = 'נדרש חיבור לאינטרנט להשלמת הטעינה הראשונית';

const answerField = (page: Page) => page.getByLabel('התשובה שלך');
const checkButton = (page: Page) => page.getByRole('button', { name: 'בדיקה' });
const progress = (page: Page) => page.getByRole('region', { name: 'ההתקדמות שלי' });
const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('link', { name });

let server: TestServer;

test.beforeEach(async () => {
  server = new TestServer(`${PWA_BUILDS_DIR}/A`);
  await server.start();
});

test.afterEach(async () => {
  await server.stop();
});

async function openPrepared(page: Page) {
  await page.goto(`${server.url}#/home`);
  await expect(page.getByText(READY)).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
}

async function goOffline(context: BrowserContext) {
  await server.stop();
  await context.setOffline(true);
}

async function product(page: Page) {
  const text = await page.locator('form bdi[dir="ltr"]').textContent();
  const match = /^(\d+)×(\d+)=\?$/.exec(text ?? '');
  if (!match) throw new Error(`Unexpected exercise text: ${text}`);
  return Number(match[1]) * Number(match[2]);
}

async function submit(page: Page, value: number) {
  await answerField(page).fill(String(value));
  await checkButton(page).click();
}

/** Every <img> finished loading and, on learn and about, the header background can be fetched. */
async function expectImagesLoaded(page: Page, withHeaderBackground = false) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.images].every((img) => img.complete && img.naturalWidth > 0),
      ),
    )
    .toBe(true);
  if (!withHeaderBackground) return;
  const backgroundOk = await page.evaluate(async () => {
    const header = document.querySelector('main header');
    if (!header) return false;
    const url = /url\("?([^")]+)"?\)/.exec(getComputedStyle(header).backgroundImage)?.[1];
    if (!url) return false;
    return (await fetch(url)).ok;
  });
  expect(backgroundOk).toBe(true);
}

test('manifest, icons and service worker scope are valid', async ({ page, request }) => {
  await openPrepared(page);

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(new URL(manifestHref!, server.url).href)).json();
  expect(manifest).toMatchObject({
    name: 'כפל בכיף',
    short_name: 'כפל בכיף',
    lang: 'he',
    dir: 'rtl',
    display: 'standalone',
    start_url: BASE,
    scope: BASE,
    id: BASE,
  });
  const purposes = manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes} ${i.purpose}`);
  expect(purposes).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);

  const icons = [
    ...manifest.icons.map((i: { src: string }) => i.src),
    await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'),
  ];
  for (const src of icons) {
    const res = await request.get(new URL(src, server.url).href);
    expect(res.status(), src).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
  }

  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(server.url);
});

test('after preparation everything works offline, with no external requests', async ({ page, context }) => {
  const requested: string[] = [];
  context.on('request', (req) => requested.push(req.url()));

  await openPrepared(page);
  await goOffline(context);
  await page.reload();

  // All three screens and their images, offline.
  await expect(page.getByRole('heading', { name: 'כפל בכיף' })).toBeVisible();
  await expectImagesLoaded(page);
  await nav(page, 'אודות').click();
  await expect(page.getByRole('table', { name: 'לוח הכפל 1–10' })).toBeVisible();
  await expectImagesLoaded(page, true);
  await nav(page, 'בית').click();

  // Local fonts are available.
  const fonts = await page.evaluate(async () => [
    (await document.fonts.load('700 20px Heebo', 'אבג')).length,
    (await document.fonts.load('400 18px Heebo', 'אבג')).length,
    (await document.fonts.load('700 32px Fredoka', 'כפל')).length,
  ]);
  expect(fonts.every((n) => n > 0)).toBe(true);

  // Profile, practice, save and progress, offline.
  await createProfile(page, 'דני');
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await expect(page).toHaveURL(/#\/learn$/);
  await expectImagesLoaded(page);
  const p = await product(page);
  await submit(page, p === 100 ? 99 : p + 1);
  await expect(page.getByText('עוד ניסיון, אפשר להצליח!')).toBeVisible();
  await submit(page, p);
  await expect(page.getByText('כל הכבוד! תשובה נכונה')).toBeVisible();
  await expect(progress(page)).toContainText('היום: תרגיל 1 נבדק');
  await expect(progress(page)).toContainText('0 נכונים בניסיון הראשון');

  // Still there after another offline reload.
  await page.reload();
  await page.getByRole('region', { name: 'בחירת פרופיל' }).getByRole('button', { name: /דני/ }).click();
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await expect(progress(page)).toContainText('היום: תרגיל 1 נבדק');
  await expect(page.getByText(NEEDS_CONNECTION)).toHaveCount(0);

  const external = requested.filter((url) => !url.startsWith(server.url));
  expect(external).toEqual([]);
});

test('a failed preparation never claims readiness and asks for a connection', async ({ page, context }) => {
  server.failing.add('hero-');
  await page.goto(`${server.url}#/home`);
  await expect(page.getByText(NEEDS_CONNECTION)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(READY)).toHaveCount(0);
  expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();

  // Offline: the app shell is loaded, so the message stays on every screen.
  await context.setOffline(true);
  for (const screen of ['אודות', 'בית']) {
    await nav(page, screen).click();
    await expect(page.getByText(NEEDS_CONNECTION)).toBeVisible();
  }

  // Back online with the file fixed: preparation completes.
  server.failing.clear();
  await context.setOffline(false);
  await expect(page.getByText(READY)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(NEEDS_CONNECTION)).toHaveCount(0);
});

test('a new version never reloads during practice and takes over after reopening', async ({ page, context }) => {
  await openPrepared(page);
  await createProfile(page, 'נועה');
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  const exercise = await page.locator('form bdi[dir="ltr"]').textContent();
  const p = await product(page);
  await submit(page, p === 100 ? 99 : p + 1);
  await expect(page.getByText('עוד ניסיון, אפשר להצליח!')).toBeVisible();
  await expect(progress(page)).toContainText('היום: תרגיל 1 נבדק');
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));

  // Deploy version B and let the browser find it.
  server.serve(`${PWA_BUILDS_DIR}/B`);
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg!.update();
  });
  await expect
    .poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting))
    .toBe(true);

  // Same page, same exercise and hint; practice continues.
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
  await expect(page.locator('form bdi[dir="ltr"]')).toHaveText(exercise!);
  await expect(page.getByText('עוד ניסיון, אפשר להצליח!')).toBeVisible();
  await expect(page.locator('meta[name="app-build"]')).toHaveAttribute('content', 'A');
  await submit(page, p);
  await expect(page.getByText('כל הכבוד! תשובה נכונה')).toBeVisible();

  // Close every window, then reopen: version B is active and the results are kept.
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(`${server.url}#/home`);
  await expect(reopened.locator('meta[name="app-build"]')).toHaveAttribute('content', 'B');
  await reopened
    .getByRole('region', { name: 'בחירת פרופיל' })
    .getByRole('button', { name: /נועה/ })
    .click();
  await reopened.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await expect(progress(reopened)).toContainText('היום: תרגיל 1 נבדק');
  await expect(progress(reopened)).toContainText('0 נכונים בניסיון הראשון');

  // Only the app's own caches remain, old precache entries were cleaned, the database is intact.
  const state = await reopened.evaluate(async () => {
    const names = await caches.keys();
    const cachedUrls = (
      await Promise.all(names.map(async (n) => (await (await caches.open(n)).keys()).map((r) => r.url)))
    ).flat();
    const dbs = await indexedDB.databases();
    return { names, cachedUrls, dbs: dbs.map((d) => d.name) };
  });
  expect(state.names.length).toBeGreaterThan(0);
  expect(state.names.every((n) => n.startsWith('kefel-bekef'))).toBe(true);
  expect(state.dbs).toContain('kefel-bekef-db');
  const indexEntries = state.cachedUrls.filter((u) => u.includes('index.html'));
  expect(indexEntries).toHaveLength(1);
});

test('a storage failure inside the installed app deletes nothing', async ({ page, context }) => {
  await openPrepared(page);
  await createProfile(page, 'דני');

  const broken = await context.newPage();
  await broken.addInitScript(() => {
    const fail = () => {
      throw new DOMException('Simulated write failure', 'QuotaExceededError');
    };
    IDBObjectStore.prototype.add = fail;
    IDBObjectStore.prototype.put = fail;
  });
  await goOffline(context);
  await broken.goto(`${server.url}#/home`);
  await openNewProfileForm(broken);
  await broken.getByLabel('כינוי').fill('נועה');
  await broken.getByRole('img', { name: 'ילד עם כובע כחול' }).click();
  await broken.getByRole('button', { name: 'יצירת פרופיל' }).click();
  await expect(broken.getByRole('alert')).toBeVisible();
  await broken.close();

  await page.reload();
  const cards = page.getByRole('region', { name: 'בחירת פרופיל' }).getByRole('button');
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('דני');
});
