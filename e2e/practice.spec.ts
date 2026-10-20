import { expect, test, type Page } from '@playwright/test';
import { createProfile } from './support/profiles';

interface StoredResult {
  id: string;
  profileId: string;
  factorA: number;
  factorB: number;
  mode: string;
  selectedFactor?: number;
  firstAttemptCorrect: boolean;
  firstCheckLocalDate: string;
  attemptCount: number;
  solved: boolean;
}

const answerField = (page: Page) => page.getByLabel('התשובה שלך');
const checkButton = (page: Page) => page.getByRole('button', { name: 'בדיקה' });
const nextButton = (page: Page) => page.getByRole('button', { name: 'לתרגיל הבא' });
const success = (page: Page) => page.getByText('כל הכבוד! תשובה נכונה');
const retry = (page: Page) => page.getByText('עוד ניסיון, אפשר להצליח!');
const invalid = (page: Page) => page.getByText('יש להקליד מספר שלם בין 1 ל־100');
const profileCards = (page: Page) =>
  page.getByRole('region', { name: 'בחירת פרופיל' }).getByRole('button');

async function startLearning(page: Page, nickname = 'דני') {
  await page.goto('#/home');
  await createProfile(page, nickname, 'ילד עם כובע כחול');
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await expect(page).toHaveURL(/#\/learn$/);
}

async function currentFactors(page: Page): Promise<[number, number]> {
  const text = await page.locator('form bdi[dir="ltr"]').textContent();
  const match = /^(\d+)×(\d+)=\?$/.exec(text ?? '');
  if (!match) throw new Error(`Unexpected exercise text: ${text}`);
  return [Number(match[1]), Number(match[2])];
}

async function product(page: Page) {
  const [a, b] = await currentFactors(page);
  return a * b;
}

async function wrongAnswer(page: Page) {
  const p = await product(page);
  return p === 100 ? 99 : p + 1;
}

async function submit(page: Page, value: number | string) {
  await answerField(page).fill(String(value));
  await checkButton(page).click();
}

function storedResults(page: Page) {
  return page.evaluate(
    () =>
      new Promise<StoredResult[]>((resolve, reject) => {
        const request = indexedDB.open('kefel-bekef-db');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('exerciseResults')) {
            db.close();
            resolve([]);
            return;
          }
          const all = db.transaction('exerciseResults', 'readonly').objectStore('exerciseResults').getAll();
          all.onsuccess = () => {
            db.close();
            resolve(all.result as StoredResult[]);
          };
          all.onerror = () => reject(all.error);
        };
      }),
  );
}

test('wrong then right: hint, manual next, and a correct stored record', async ({ page }) => {
  await startLearning(page);
  const [a, b] = await currentFactors(page);
  for (const n of [a, b]) expect(n).toBeGreaterThanOrEqual(1);
  for (const n of [a, b]) expect(n).toBeLessThanOrEqual(10);

  await submit(page, await wrongAnswer(page));
  await expect(retry(page)).toBeVisible();
  await expect(page.getByText(/^אפשר לחשב/)).toBeVisible();
  expect(await currentFactors(page)).toEqual([a, b]);
  await expect(nextButton(page)).toHaveCount(0);

  await submit(page, a * b);
  await expect(success(page)).toBeVisible();
  await expect(checkButton(page)).toBeDisabled();
  await expect(nextButton(page)).toBeVisible();

  await expect.poll(() => storedResults(page)).toMatchObject([
    { factorA: a, factorB: b, firstAttemptCorrect: false, attemptCount: 2, solved: true, mode: 'random' },
  ]);
  const [record] = await storedResults(page);
  expect(record!.firstCheckLocalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  await nextButton(page).click();
  await expect(answerField(page)).toHaveValue('');
  await expect(answerField(page)).toBeFocused();
  await expect(success(page)).toHaveCount(0);
});

test('invalid input is not an attempt and does not change the exercise', async ({ page }) => {
  await startLearning(page);
  const factors = await currentFactors(page);
  for (const value of ['', '0', '101', '12abc', '-5', '4.5']) {
    await submit(page, value);
    await expect(invalid(page)).toBeVisible();
  }
  expect(await currentFactors(page)).toEqual(factors);
  expect(await storedResults(page)).toEqual([]);
});

test('fast clicks and re-checking the same value do not double count or skip', async ({ page }) => {
  await startLearning(page);
  await answerField(page).fill(String(await wrongAnswer(page)));
  await checkButton(page).dblclick();
  await expect(retry(page)).toBeVisible();
  await checkButton(page).click();
  await checkButton(page).click();
  await expect.poll(() => storedResults(page)).toMatchObject([{ attemptCount: 1 }]);

  await answerField(page).fill(String(await product(page)));
  await checkButton(page).dblclick();
  await expect(success(page)).toBeVisible();
  await expect.poll(() => storedResults(page)).toMatchObject([{ attemptCount: 2, solved: true }]);

  await nextButton(page).dblclick();
  await expect(success(page)).toHaveCount(0);
  await expect(invalid(page)).toHaveCount(0);
  await expect(answerField(page)).toHaveValue('');
  expect(await storedResults(page)).toHaveLength(1);
});

test('a checked exercise that is abandoned stays saved; an unchecked one is not saved', async ({
  page,
}) => {
  await startLearning(page);
  await submit(page, await wrongAnswer(page));
  await expect(retry(page)).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'אודות' }).click();
  await expect.poll(() => storedResults(page)).toMatchObject([
    { firstAttemptCorrect: false, attemptCount: 1, solved: false },
  ]);

  await page.getByRole('navigation').getByRole('link', { name: 'לימוד' }).click();
  await answerField(page).fill(String(await product(page)));
  await page.reload();
  await expect(page).toHaveURL(/#\/home$/);
  expect(await storedResults(page)).toHaveLength(1);
});

test('selected-factor mode fixes the factor; switching mode keeps saved results', async ({ page }) => {
  await startLearning(page);
  const select = page.getByLabel('כפולה', { exact: true });
  await expect(select).toBeDisabled();
  await page.getByRole('radio', { name: 'תרגול לפי כפולה' }).check();
  await expect(select).toBeEnabled();
  await select.selectOption('7');

  for (let i = 0; i < 4; i++) {
    const [a] = await currentFactors(page);
    expect(a).toBe(7);
    await submit(page, await product(page));
    await expect(success(page)).toBeVisible();
    await nextButton(page).click();
  }
  await expect.poll(async () => (await storedResults(page)).length).toBe(4);

  await page.getByRole('radio', { name: 'תרגול אקראי' }).check();
  await expect(select).toBeDisabled();
  await expect(answerField(page)).toHaveValue('');
  const results = await storedResults(page);
  expect(results).toHaveLength(4);
  for (const r of results) expect(r).toMatchObject({ mode: 'selectedFactor', selectedFactor: 7, factorA: 7 });
});

test('results stay with the profile that checked them, also after a refresh', async ({ page }) => {
  await page.goto('#/home');
  await createProfile(page, 'נועה', 'ילדה עם שיער חום');
  await createProfile(page, 'נועה', 'ילד עם רקע ירוק');

  // First "נועה"
  await profileCards(page).nth(0).click();
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await submit(page, await wrongAnswer(page));
  await expect(retry(page)).toBeVisible();

  // Switch to the second "נועה" mid-exercise; the open exercise is discarded.
  await page.getByRole('navigation').getByRole('link', { name: 'בית' }).click();
  await profileCards(page).nth(1).click();
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await expect(retry(page)).toHaveCount(0);
  await expect(answerField(page)).toHaveValue('');
  await submit(page, await product(page));
  await expect(success(page)).toBeVisible();

  const ids = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const request = indexedDB.open('kefel-bekef-db');
        request.onsuccess = () => {
          const db = request.result;
          const all = db.transaction('profiles').objectStore('profiles').getAll();
          all.onsuccess = () => {
            db.close();
            const profiles = all.result as { id: string; createdAt: number }[];
            resolve(profiles.sort((x, y) => x.createdAt - y.createdAt).map((p) => p.id));
          };
        };
      }),
  );
  await expect.poll(async () => (await storedResults(page)).length).toBe(2);

  const check = async () => {
    const results = await storedResults(page);
    const first = results.filter((r) => r.profileId === ids[0]);
    const second = results.filter((r) => r.profileId === ids[1]);
    expect(first).toMatchObject([{ firstAttemptCorrect: false, solved: false }]);
    expect(second).toMatchObject([{ firstAttemptCorrect: true, solved: true }]);
  };
  await check();
  await page.reload();
  await check();
});

test('a failed write shows feedback but says the results were not saved', async ({ page }) => {
  await startLearning(page);
  await page.evaluate(() => {
    const fail = () => {
      throw new DOMException('Simulated write failure', 'QuotaExceededError');
    };
    IDBObjectStore.prototype.add = fail;
    IDBObjectStore.prototype.put = fail;
  });
  await submit(page, await product(page));
  await expect(success(page)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('התוצאות לא נשמרו במכשיר');
  expect(await storedResults(page)).toEqual([]);

  // Practice continues in memory.
  await nextButton(page).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(answerField(page)).toHaveValue('');
});

test('a Milestone 2 database is upgraded in the browser without losing profiles', async ({ page }) => {
  // Create the exact schema Milestone 2 shipped (Dexie version 1 = IndexedDB version 10) before the app runs.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const request = indexedDB.open('kefel-bekef-db', 10);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('profiles', { keyPath: 'id' });
      store.put({ id: 'old-1', nickname: 'מיכל', avatarId: 'avatar-2', createdAt: 1 });
      store.put({ id: 'old-2', nickname: 'יואב', avatarId: 'avatar-3', createdAt: 2 });
    };
    request.onsuccess = () => request.result.close();
  });
  await page.goto('#/home');
  await expect(profileCards(page)).toHaveText(['מיכל', 'יואב']);

  await profileCards(page).nth(1).click();
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await submit(page, await product(page));
  await expect(success(page)).toBeVisible();
  await expect.poll(() => storedResults(page)).toMatchObject([{ profileId: 'old-2', solved: true }]);

  const version = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const request = indexedDB.open('kefel-bekef-db');
        request.onsuccess = () => {
          resolve(request.result.version);
          request.result.close();
        };
      }),
  );
  expect(version).toBe(20);
});
