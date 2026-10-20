import { expect, test, type Page } from '@playwright/test';

async function createProfile(page: Page, nickname: string, avatarAlt: string) {
  await page.getByLabel('כינוי').fill(nickname);
  await page.getByRole('img', { name: avatarAlt }).click();
  await page.getByRole('button', { name: 'יצירת פרופיל' }).click();
  await expect(page.getByLabel('כינוי')).toHaveValue('');
}

const scenarios: { name: string; setup: (page: Page) => Promise<void> }[] = [
  { name: 'home without profiles', setup: (page) => page.goto('/#/home').then(() => undefined) },
  {
    name: 'home with three profiles',
    setup: async (page) => {
      await page.goto('/#/home');
      await createProfile(page, 'נועה', 'ילדה עם שיער חום');
      await createProfile(page, 'דני', 'ילד עם כובע כחול');
      await createProfile(page, 'כינוי ארוך מאוד לבדיקה', 'ילד עם רקע ירוק');
    },
  },
  {
    name: 'learn with an active profile',
    setup: async (page) => {
      await page.goto('/#/home');
      await createProfile(page, 'דני', 'ילד עם כובע כחול');
      await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
      await expect(page).toHaveURL(/#\/learn$/);
    },
  },
  { name: 'about', setup: (page) => page.goto('/#/about').then(() => undefined) },
];

for (const scenario of scenarios) {
  test(`layout: ${scenario.name}`, async ({ page }, testInfo) => {
    const external: string[] = [];
    page.on('request', (req) => {
      if (!req.url().startsWith('http://localhost')) external.push(req.url());
    });

    await scenario.setup(page);
    await page.evaluate(() => document.fonts.ready);

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Every image is loaded from the local server.
    const images = await page.locator('img').evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).map((img) => ({
        local: img.currentSrc.startsWith(location.origin),
        loaded: img.complete && img.naturalWidth > 0,
      })),
    );
    for (const image of images) expect(image).toEqual({ local: true, loaded: true });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const lastBottom = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      const last = main.querySelector(':scope > * > *:last-child') ?? main.lastElementChild!;
      return last.getBoundingClientRect().bottom;
    });
    const navTop = await page.evaluate(
      () => document.querySelector('nav')!.getBoundingClientRect().top,
    );
    expect(lastBottom).toBeLessThanOrEqual(navTop);

    const fontsOk = await page.evaluate(
      () =>
        document.fonts.check('700 32px Fredoka', 'כפל') &&
        document.fonts.check('400 18px Heebo', 'כפל'),
    );
    expect(fontsOk).toBe(true);

    expect(external).toEqual([]);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('screen.png'), fullPage: true });
  });
}
