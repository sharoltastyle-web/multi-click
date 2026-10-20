import { expect, test } from '@playwright/test';

for (const hash of ['#/home', '#/about']) {
  test.describe(`layout on ${hash}`, () => {
    test('is RTL Hebrew, has no horizontal overflow, and nav does not cover content', async ({
      page,
    }) => {
      const external: string[] = [];
      page.on('request', (req) => {
        if (!req.url().startsWith('http://localhost')) external.push(req.url());
      });

      await page.goto(`/${hash}`);
      await page.evaluate(() => document.fonts.ready);

      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('html')).toHaveAttribute('lang', 'he');

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

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

      // Fonts actually loaded (local, bundled).
      const fontsOk = await page.evaluate(
        () =>
          document.fonts.check('700 32px Fredoka', 'כפל') &&
          document.fonts.check('400 18px Heebo', 'כפל'),
      );
      expect(fontsOk).toBe(true);

      expect(external).toEqual([]);
    });
  });
}
