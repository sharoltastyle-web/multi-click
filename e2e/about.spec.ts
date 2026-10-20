import { expect, test } from '@playwright/test';

test('about shows the full multiplication table, the text and local images', async ({ page }) => {
  await page.goto('/#/about');
  const table = page.getByRole('table', { name: 'לוח הכפל 1–10' });
  await expect(table).toBeVisible();

  const products = await table.locator('tbody tr').evaluateAll((rows) =>
    rows.map((row) => [...row.querySelectorAll('td')].map((td) => Number(td.textContent))),
  );
  expect(products).toEqual(
    Array.from({ length: 10 }, (_, a) => Array.from({ length: 10 }, (_, b) => (a + 1) * (b + 1))),
  );

  // Numbers run left-to-right like the design: "1" header left of "10".
  const one = await table.locator('thead th', { hasText: /^1$/ }).boundingBox();
  const ten = await table.locator('thead th', { hasText: /^10$/ }).boundingBox();
  expect(one!.x).toBeLessThan(ten!.x);

  await expect(page.getByText('התוצאות נשמרות במכשיר לכל פרופיל.')).toBeVisible();

  const headerBgLoaded = await page.evaluate(async () => {
    const url = getComputedStyle(document.querySelector('header')!).backgroundImage.slice(5, -2);
    const img = new Image();
    img.src = url;
    await img.decode();
    return url.startsWith(location.origin) && img.naturalWidth > 0;
  });
  expect(headerBgLoaded).toBe(true);

  await page.getByRole('link', { name: 'חזרה לבית' }).click();
  await expect(page).toHaveURL(/#\/home$/);
});
