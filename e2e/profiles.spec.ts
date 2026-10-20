import { expect, test, type Page } from '@playwright/test';
import { createProfile } from './support/profiles';

const learnButton = (page: Page) => page.getByRole('button', { name: 'ללימוד לוח הכפל' });
const profileCards = (page: Page) =>
  page.getByRole('region', { name: 'בחירת פרופיל' }).getByRole('button');

test('empty database shows only the form, and learn asks to choose a profile', async ({ page }) => {
  await page.goto('#/home');
  await expect(page.getByRole('heading', { name: 'פרופיל חדש' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'בחירת פרופיל' })).toHaveCount(0);

  await learnButton(page).click();
  await expect(page.getByText('יש לבחור פרופיל לפני התרגול')).toBeVisible();
  await expect(page).toHaveURL(/#\/home$/);
});

test('incomplete input does not create a profile', async ({ page }) => {
  await page.goto('#/home');
  await page.getByRole('button', { name: 'יצירת פרופיל' }).click();
  await expect(page.getByText('יש להקליד כינוי')).toBeVisible();
  await expect(page.getByText('יש לבחור אווטאר')).toBeVisible();

  await page.getByLabel('כינוי').fill('דני');
  await page.getByRole('button', { name: 'יצירת פרופיל' }).click();
  await expect(page.getByText('יש לבחור אווטאר')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'פרופיל חדש' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'בחירת פרופיל' })).toHaveCount(0);
});

test('profiles persist, duplicate nicknames stay separate, and learn shows the chosen one', async ({
  page,
  context,
}) => {
  await page.goto('#/home');
  await createProfile(page, 'נועה', 'ילדה עם שיער חום');
  await createProfile(page, 'נועה', 'ילד עם רקע ירוק');
  await createProfile(page, 'דני', 'ילד עם כובע כחול');
  await expect(profileCards(page)).toHaveText(['נועה', 'נועה', 'דני']);
  // The newest profile is selected after creation.
  await expect(profileCards(page).nth(2)).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(profileCards(page)).toHaveText(['נועה', 'נועה', 'דני']);
  await expect(profileCards(page).nth(2)).toHaveAttribute('aria-pressed', 'false');

  // A new page in the same browser profile (like closing and reopening the app) sees the same data.
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('#/home');
  await expect(profileCards(reopened)).toHaveText(['נועה', 'נועה', 'דני']);

  // Choose the second "נועה" (green avatar) and enter learn.
  await profileCards(reopened).nth(1).click();
  await expect(profileCards(reopened).nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(profileCards(reopened).nth(0)).toHaveAttribute('aria-pressed', 'false');
  await learnButton(reopened).click();
  await expect(reopened).toHaveURL(/#\/learn$/);
  const header = reopened.locator('header');
  await expect(header.getByText('נועה')).toBeVisible();
  await expect(header.locator('img[src*="avatar-3"]')).toBeVisible();

  // Back home, switch to the first "נועה" and the learn screen follows the id, not the nickname.
  await reopened.getByRole('navigation').getByRole('link', { name: 'בית' }).click();
  await profileCards(reopened).nth(0).click();
  await reopened.getByRole('navigation').getByRole('link', { name: 'לימוד' }).click();
  await expect(reopened).toHaveURL(/#\/learn$/);
  await expect(reopened.locator('header img[src*="avatar-2"]')).toBeVisible();

  // After a refresh nothing is active, so learn redirects home.
  await reopened.reload();
  await expect(reopened).toHaveURL(/#\/home$/);
});

test('fast double click creates a single profile', async ({ page }) => {
  await page.goto('#/home');
  await page.getByLabel('כינוי').fill('דני');
  await page.getByRole('img', { name: 'ילד עם כובע כחול' }).click();
  await page.getByRole('button', { name: 'יצירת פרופיל' }).dblclick();
  await expect(profileCards(page)).toHaveCount(1);
  await page.reload();
  await expect(profileCards(page)).toHaveCount(1);
});

test('IndexedDB failure is shown clearly and never as a successful creation', async ({ page }) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('Storage disabled', 'UnknownError');
    };
  });
  await page.goto('#/home');
  await expect(page.getByText('לא ניתן לשמור פרופילים במכשיר הזה כרגע.')).toBeVisible();

  await page.getByLabel('כינוי').fill('דני');
  await page.getByRole('img', { name: 'ילד עם כובע כחול' }).click();
  await page.getByRole('button', { name: 'יצירת פרופיל' }).click();
  await expect(
    page.getByText('לא הצלחנו לשמור את הפרופיל במכשיר. אפשר לנסות שוב.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'בחירת פרופיל' })).toHaveCount(0);
  await expect(page.getByLabel('כינוי')).toHaveValue('דני');
});
