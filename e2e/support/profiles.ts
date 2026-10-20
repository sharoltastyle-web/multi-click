import { expect, type Page } from '@playwright/test';

/** The folded new-profile form's opener, shown on home once profiles exist. */
export const newProfileButton = (page: Page) =>
  page.getByRole('button', { name: 'פרופיל חדש', exact: true });

/** Opens the new-profile form if it is folded; waits until home has loaded either way. */
export async function openNewProfileForm(page: Page) {
  const field = page.getByLabel('כינוי');
  await expect(field.or(newProfileButton(page))).toBeVisible();
  if (await newProfileButton(page).isVisible()) await newProfileButton(page).click();
  await expect(field).toBeVisible();
}

/** Creates a profile from home; after success the form folds and the new profile is active. */
export async function createProfile(page: Page, nickname: string, avatarAlt = 'ילד עם כובע כחול') {
  await openNewProfileForm(page);
  await page.getByLabel('כינוי').fill(nickname);
  await page.getByRole('img', { name: avatarAlt }).click();
  await page.getByRole('button', { name: 'יצירת פרופיל' }).click();
  await expect(newProfileButton(page)).toBeVisible();
}
