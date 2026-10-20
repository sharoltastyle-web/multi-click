import { expect, test, type Page } from '@playwright/test';

const nav = (page: Page) => page.getByRole('navigation', { name: 'ניווט ראשי' });
const navLink = (page: Page, label: string) => nav(page).getByRole('link', { name: label });

async function expectActive(page: Page, label: string) {
  await expect(navLink(page, label)).toHaveAttribute('aria-current', 'page');
  for (const other of ['בית', 'לימוד', 'אודות'].filter((l) => l !== label)) {
    await expect(navLink(page, other)).not.toHaveAttribute('aria-current', 'page');
  }
}

test('opening without a hash lands on home', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.getByRole('heading', { level: 1, name: 'כפל בכיף' })).toBeVisible();
  await expectActive(page, 'בית');
});

test('navigates to about, survives refresh, and Back returns home', async ({ page }) => {
  await page.goto('#/home');
  await navLink(page, 'אודות').click();
  await expect(page).toHaveURL(/#\/about$/);
  await expect(page.getByRole('heading', { level: 1, name: 'אודות כפל בכיף' })).toBeVisible();
  await expectActive(page, 'אודות');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'אודות כפל בכיף' })).toBeVisible();
  await expectActive(page, 'אודות');

  await page.goBack();
  await expect(page).toHaveURL(/#\/home$/);
  await expectActive(page, 'בית');
});

test('"back to home" button on about returns home', async ({ page }) => {
  await page.goto('#/about');
  await page.getByRole('link', { name: 'חזרה לבית' }).click();
  await expect(page).toHaveURL(/#\/home$/);
  await expectActive(page, 'בית');
});

test('unknown route redirects to home', async ({ page }) => {
  await page.goto('#/unknown');
  await expect(page).toHaveURL(/#\/home$/);
  await expectActive(page, 'בית');
});

test('learn without an active profile redirects to home', async ({ page }) => {
  await page.goto('#/learn');
  await expect(page).toHaveURL(/#\/home$/);
  await expectActive(page, 'בית');

  await navLink(page, 'לימוד').click();
  await expect(page).toHaveURL(/#\/home$/);

  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.getByText('יש לבחור פרופיל לפני התרגול')).toBeVisible();
});

test('nav labels are in Hebrew and ordered right-to-left: home, learn, about', async ({ page }) => {
  await page.goto('./');
  await expect(nav(page).getByRole('link')).toHaveCount(3);
  const labels = await nav(page).getByRole('link').allInnerTexts();
  expect(labels.map((l) => l.trim())).toEqual(['בית', 'לימוד', 'אודות']);

  const home = await navLink(page, 'בית').boundingBox();
  const learn = await navLink(page, 'לימוד').boundingBox();
  const about = await navLink(page, 'אודות').boundingBox();
  expect(home!.x).toBeGreaterThan(learn!.x);
  expect(learn!.x).toBeGreaterThan(about!.x);
});

test('every request stays under the site base path, with no missing files', async ({ page, baseURL }) => {
  const outside: string[] = [];
  const failed: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith(baseURL!)) outside.push(req.url());
  });
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
  });

  for (const route of ['#/home', '#/about']) {
    await page.goto(route);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await page.goto('#/home');
  await page.getByLabel('כינוי').fill('דני');
  await page.getByRole('img', { name: 'ילד עם כובע כחול' }).click();
  await page.getByRole('button', { name: 'יצירת פרופיל' }).click();
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await expect(page).toHaveURL(/#\/learn$/);
  await expect(page.getByLabel('התשובה שלך')).toBeVisible();

  expect(outside).toEqual([]);
  expect(failed).toEqual([]);
});
