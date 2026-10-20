import { expect, test, type Page } from '@playwright/test';
import { createProfile } from './support/profiles';

const scenarios: { name: string; setup: (page: Page) => Promise<void> }[] = [
  { name: 'home without profiles', setup: (page) => page.goto('#/home').then(() => undefined) },
  {
    name: 'home with three profiles',
    setup: async (page) => {
      await page.goto('#/home');
      await createProfile(page, 'נועה', 'ילדה עם שיער חום');
      await createProfile(page, 'דני', 'ילד עם כובע כחול');
      await createProfile(page, 'כינוי ארוך מאוד לבדיקה', 'ילד עם רקע ירוק');
    },
  },
  {
    name: 'learn with an active profile',
    setup: async (page) => {
      await page.goto('#/home');
      await createProfile(page, 'דני', 'ילד עם כובע כחול');
      await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
      await expect(page).toHaveURL(/#\/learn$/);
    },
  },
  {
    name: 'learn after a wrong answer (hint)',
    setup: async (page) => {
      await page.goto('#/home');
      await createProfile(page, 'דני', 'ילד עם כובע כחול');
      await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
      await page.getByRole('radio', { name: 'תרגול לפי כפולה' }).check();
      await page.getByLabel('כפולה', { exact: true }).selectOption('10');
      const text = (await page.locator('form bdi[dir="ltr"]').textContent()) ?? '';
      const [, b] = /^10×(\d+)/.exec(text)!;
      const wrong = 10 * Number(b) === 100 ? 99 : 10 * Number(b) + 1;
      await page.getByLabel('התשובה שלך').fill(String(wrong));
      await page.getByRole('button', { name: 'בדיקה' }).click();
      await expect(page.getByText('עוד ניסיון, אפשר להצליח!')).toBeVisible();
    },
  },
  {
    name: 'learn after a correct answer',
    setup: async (page) => {
      await page.goto('#/home');
      await createProfile(page, 'דני', 'ילד עם כובע כחול');
      await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
      const text = (await page.locator('form bdi[dir="ltr"]').textContent()) ?? '';
      const [, a, b] = /^(\d+)×(\d+)/.exec(text)!;
      await page.getByLabel('התשובה שלך').fill(String(Number(a) * Number(b)));
      await page.getByRole('button', { name: 'בדיקה' }).click();
      await expect(page.getByRole('button', { name: 'לתרגיל הבא' })).toBeVisible();
    },
  },
  { name: 'about', setup: (page) => page.goto('#/about').then(() => undefined) },
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
    // Viewport shot at the bottom: what the child sees above the fixed navigation.
    await page.screenshot({ path: testInfo.outputPath('bottom.png') });

    // WebKit may report fonts as ready before the lazily requested faces finished loading.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.fonts.check('700 32px Fredoka', 'כפל') &&
            document.fonts.check('400 18px Heebo', 'כפל'),
        ),
      )
      .toBe(true);

    expect(external).toEqual([]);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('screen.png'), fullPage: true });
  });
}
