import { expect, test, type Page } from '@playwright/test';

interface SeedDay {
  date: string;
  checked: number;
  correct: number;
}

const answerField = (page: Page) => page.getByLabel('התשובה שלך');
const checkButton = (page: Page) => page.getByRole('button', { name: 'בדיקה' });
const nextButton = (page: Page) => page.getByRole('button', { name: 'לתרגיל הבא' });
const success = (page: Page) => page.getByText('כל הכבוד! תשובה נכונה');
const retry = (page: Page) => page.getByText('עוד ניסיון, אפשר להצליח!');
const noResults = (page: Page) => page.getByText('עדיין אין תוצאות. אפשר להתחיל לתרגל!');
const progress = (page: Page) => page.getByRole('region', { name: 'ההתקדמות שלי' });
const chart = (page: Page) => progress(page).getByRole('img');
const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('link', { name });
const profileCards = (page: Page) =>
  page.getByRole('region', { name: 'בחירת פרופיל' }).getByRole('button');

async function createProfile(page: Page, nickname: string, avatarAlt = 'ילד עם כובע כחול') {
  await page.getByLabel('כינוי').fill(nickname);
  await page.getByRole('img', { name: avatarAlt }).click();
  await page.getByRole('button', { name: 'יצירת פרופיל' }).click();
  await expect(page.getByLabel('כינוי')).toHaveValue('');
}

async function startLearning(page: Page, nickname = 'דני') {
  await page.goto('/#/home');
  await createProfile(page, nickname);
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await expect(page).toHaveURL(/#\/learn$/);
}

async function product(page: Page) {
  const text = await page.locator('form bdi[dir="ltr"]').textContent();
  const match = /^(\d+)×(\d+)=\?$/.exec(text ?? '');
  if (!match) throw new Error(`Unexpected exercise text: ${text}`);
  return Number(match[1]) * Number(match[2]);
}

async function wrongAnswer(page: Page) {
  const p = await product(page);
  return p === 100 ? 99 : p + 1;
}

async function submit(page: Page, value: number) {
  await answerField(page).fill(String(value));
  await checkButton(page).click();
}

/** Remounts the learn screen through the bottom navigation, as a child would. */
async function revisitLearn(page: Page) {
  await nav(page, 'אודות').click();
  await nav(page, 'לימוד').click();
  await expect(page).toHaveURL(/#\/learn$/);
}

/** Writes checked results for every profile in the database (one test profile is expected). */
function seed(page: Page, days: SeedDay[]) {
  return page.evaluate(
    (seedDays) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('kefel-bekef-db');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['profiles', 'exerciseResults'], 'readwrite');
          const all = tx.objectStore('profiles').getAll();
          all.onsuccess = () => {
            const store = tx.objectStore('exerciseResults');
            for (const profile of all.result as { id: string }[]) {
              for (const day of seedDays) {
                for (let i = 0; i < day.checked; i++) {
                  const correct = i < day.correct;
                  store.put({
                    id: crypto.randomUUID(),
                    profileId: profile.id,
                    factorA: 3,
                    factorB: 4,
                    mode: 'random',
                    firstCheckedAt: new Date(`${day.date}T12:00:00`).getTime(),
                    firstCheckLocalDate: day.date,
                    firstAttemptCorrect: correct,
                    attemptCount: correct ? 1 : 2,
                    solved: true,
                    lastSubmittedAnswer: 12,
                    lastSubmissionKey: crypto.randomUUID(),
                    revision: correct ? 1 : 2,
                  });
                }
              }
            }
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    days,
  );
}

function storedResults(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ firstCheckLocalDate: string; profileId: string }[]>((resolve) => {
        const request = indexedDB.open('kefel-bekef-db');
        request.onsuccess = () => {
          const db = request.result;
          const all = db.transaction('exerciseResults').objectStore('exerciseResults').getAll();
          all.onsuccess = () => {
            db.close();
            resolve(all.result as { firstCheckLocalDate: string; profileId: string }[]);
          };
        };
      }),
  );
}

test('10 checked exercises with 8 correct on the first attempt show 10, 8 and 80%', async ({ page }) => {
  await startLearning(page);
  await expect(noResults(page)).toBeVisible();
  // No mockup sample data is shown before real practice.
  await expect(progress(page)).not.toContainText(/17\.10|40%|10 תרגילים/);

  for (let i = 0; i < 10; i++) {
    if (i < 2) {
      await submit(page, await wrongAnswer(page));
      await expect(retry(page)).toBeVisible();
    }
    await submit(page, await product(page));
    await expect(success(page)).toBeVisible();
    await nextButton(page).click();
    await expect(answerField(page)).toHaveValue('');
  }

  await expect(progress(page)).toContainText('היום: 10 תרגילים נבדקו');
  await expect(progress(page)).toContainText('8 נכונים בניסיון הראשון · 80%');
  await expect(chart(page).locator('circle')).toHaveCount(1);
});

test('retries count once and an exercise abandoned after a mistake stays in the denominator', async ({ page }) => {
  await startLearning(page);
  const wrong = await wrongAnswer(page);
  await submit(page, wrong);
  await expect(retry(page)).toBeVisible();
  await expect(progress(page)).toContainText('היום: תרגיל 1 נבדק');
  await submit(page, wrong === 99 ? 98 : wrong + 1);
  // Typing is locked while a check is saving; wait until it finished.
  await expect(checkButton(page)).toBeEnabled();
  await submit(page, await product(page));
  await expect(success(page)).toBeVisible();
  await expect(progress(page)).toContainText('היום: תרגיל 1 נבדק');
  await expect(progress(page)).toContainText('0 נכונים בניסיון הראשון · 0%');

  await nextButton(page).click();
  await submit(page, await wrongAnswer(page));
  await expect(retry(page)).toBeVisible();
  await revisitLearn(page);
  await expect(progress(page)).toContainText('היום: 2 תרגילים נבדקו');
  await expect(progress(page)).toContainText('0 נכונים בניסיון הראשון · 0%');
});

test('skipped days are not zero and only the latest 7 practice days are drawn', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-20T10:00:00') });
  await startLearning(page);
  const days = ['2026-09-20', '2026-09-25', '2026-10-01', '2026-10-03', '2026-10-08', '2026-10-10', '2026-10-14', '2026-10-17', '2026-10-19'];
  await seed(
    page,
    days.map((date, i) => ({ date, checked: 5, correct: i % 5 })),
  );
  await revisitLearn(page);

  await expect(chart(page).locator('circle')).toHaveCount(7);
  const label = await chart(page).getAttribute('aria-label');
  expect(label).toBe(
    'אחוז הצלחה בניסיון הראשון: 1.10 40%, 3.10 60%, 8.10 80%, 10.10 0%, 14.10 20%, 17.10 40%, 19.10 60%',
  );
  // Days without practice are not drawn as 0%: 7 points only, and nothing is deleted.
  expect(await storedResults(page)).toHaveLength(45);
  await expect(progress(page)).toContainText('היום: עדיין לא נבדקו תרגילים');
  await expect(progress(page)).not.toContainText('בניסיון הראשון');
});

test('a single practice day is one point without a trend line', async ({ page }) => {
  await startLearning(page);
  await submit(page, await product(page));
  await expect(success(page)).toBeVisible();
  await expect(chart(page).locator('circle')).toHaveCount(1);
  await expect(chart(page).locator('polyline')).toHaveCount(0);
  await expect(progress(page)).toContainText('1 נכון בניסיון הראשון · 100%');
});

test('a check before midnight stays on its day after a correction past midnight', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-18T23:59:30') });
  await startLearning(page);
  await submit(page, await wrongAnswer(page));
  await expect(retry(page)).toBeVisible();

  await page.clock.setSystemTime(new Date('2026-10-19T00:05:00'));
  await submit(page, await product(page));
  await expect(success(page)).toBeVisible();

  const [result] = await storedResults(page);
  expect(result?.firstCheckLocalDate).toBe('2026-10-18');
  await revisitLearn(page);
  await expect(chart(page)).toHaveAttribute('aria-label', 'אחוז הצלחה בניסיון הראשון: 18.10 0%');
  await expect(progress(page)).toContainText('היום: עדיין לא נבדקו תרגילים');
});

test('a different time zone keeps the stored local day', async ({ browser, baseURL }) => {
  // Checked at 00:30 in Jerusalem: still 18.10 in UTC and New York.
  const jerusalem = await browser.newContext({ timezoneId: 'Asia/Jerusalem', baseURL });
  const first = await jerusalem.newPage();
  await first.clock.install({ time: new Date('2026-10-18T21:30:00Z') });
  await startLearning(first);
  await submit(first, await product(first));
  await expect(success(first)).toBeVisible();
  await expect(chart(first)).toHaveAttribute('aria-label', 'אחוז הצלחה בניסיון הראשון: 19.10 100%');
  const [record] = await storedResults(first);
  expect(record?.firstCheckLocalDate).toBe('2026-10-19');
  await jerusalem.close();

  const newYork = await browser.newContext({ timezoneId: 'America/New_York', baseURL });
  const second = await newYork.newPage();
  await second.clock.install({ time: new Date('2026-10-18T22:00:00Z') });
  await startLearning(second);
  await seed(second, [{ date: '2026-10-19', checked: 1, correct: 1 }]);
  await revisitLearn(second);
  await expect(chart(second)).toHaveAttribute('aria-label', 'אחוז הצלחה בניסיון הראשון: 19.10 100%');
  await newYork.close();
});

test('profiles do not share progress, and the same progress returns after a reload', async ({ page }) => {
  await page.goto('/#/home');
  await createProfile(page, 'נועה', 'ילדה עם שיער חום');
  await createProfile(page, 'יואב', 'ילד עם רקע ירוק');

  await profileCards(page).nth(0).click();
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await submit(page, await product(page));
  await expect(progress(page)).toContainText('היום: תרגיל 1 נבדק');

  await nav(page, 'בית').click();
  await profileCards(page).nth(1).click();
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await expect(noResults(page)).toBeVisible();

  await page.reload();
  await nav(page, 'בית').click();
  await profileCards(page).nth(0).click();
  await page.getByRole('button', { name: 'ללימוד לוח הכפל' }).click();
  await expect(progress(page)).toContainText('היום: תרגיל 1 נבדק');
  await expect(progress(page)).toContainText('1 נכון בניסיון הראשון · 100%');
});

test('a failed save is not added to the progress', async ({ page }) => {
  await startLearning(page);
  await expect(noResults(page)).toBeVisible();
  await page.evaluate(() => {
    const fail = () => {
      throw new DOMException('Simulated write failure', 'QuotaExceededError');
    };
    IDBObjectStore.prototype.add = fail;
    IDBObjectStore.prototype.put = fail;
  });
  await submit(page, await product(page));
  await expect(page.getByText('התוצאות לא נשמרו במכשיר')).toBeVisible();
  await expect(noResults(page)).toBeVisible();
  await expect(chart(page)).toHaveCount(0);
});
