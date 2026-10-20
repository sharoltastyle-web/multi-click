# תוכנית — Milestone 6: מוצר מפורסם ופריסה אוטומטית

מבוסס על MILESTONES.md (M6), ARCHITECTURE.md (סעיפים 6, 7, 9, 10 ו־ADR-4, ADR-9) והקוד הקיים אחרי M5.

## מטרה

האפליקציה זמינה בכתובת GitHub Pages הציבורית, ניתנת להתקנה ועובדת ללא אינטרנט. כל Push ל־`main` עובר בדיקות ומתפרסם אוטומטית; Pull Request רק נבדק; כשל חוסם פרסום.

## נתונים קבועים

- Repository: `sharoltastyle-web/multi-click` (Remote `origin`, ענף `main`).
- כתובת המוצר: `https://sharoltastyle-web.github.io/multi-click/`
- Base Path: `/multi-click/`.
- אין שינוי Schema ב־M6 (נשאר גרסה 2). אין Migration.

## מה עושה המשתמשת בעצמה (אדריך צעד אחר צעד בשפה פשוטה)

1. **נראות ה־Repository:** לוודא ב־GitHub שה־Repository ציבורי (Public). אם הוא פרטי — לעצור ולהחליט יחד (Pages ל־Repository פרטי דורש תוכנית בתשלום; אין לשנות נראות אוטומטית).
2. **הפעלת Pages:** Settings ← Pages ← Source: **GitHub Actions**.
3. **אישור Push:** הבנייה דורשת Push ל־`main` כדי להוכיח פריסה אמיתית. לפי CLAUDE.md אעצור ואבקש אישור לפני כל Push (ענף `main` ו/או ענף בדיקה).
4. **Pull Request לבדיקה:** אין `gh` מותקן, לכן את ה־PR לבדיקת החסימה תפתח המשתמשת באתר GitHub לפי הנחיה (או שנחליט יחד להתקין `gh`).
5. **מכשירים אמיתיים:** בדיקת התקנה ו־Offline ב־Android (Chrome) וב־iPhone (Safari) לפי רשימת בדיקה שאכין. בדיקה שלא בוצעה תדווח כחסרה.

## מצב קיים רלוונטי

- `vite.config.ts`: `const BASE = '/'`; Manifest (`start_url`, `scope`, `id`) נגזר ממנו; `APP_BUILD_ID` נכתב ל־`<meta name="app-build">`.
- `src/pwa/usePwaStatus.ts` כבר משתמש ב־`import.meta.env.BASE_URL`.
- `index.html` מפנה ל־`/icons/...` — Vite מוסיף את ה־Base לנכסי `public` ב־HTML; לאמת ב־Build.
- בדיקות Playwright מניחות שורש `/`: `goto('/#/...')`, `baseURL` ללא נתיב, `TestServer` מגיש מהשורש, ו־`pwa.spec.ts` מצפה ל־`start_url: '/'`.
- אין תיקיית `.github`.

## 1. Base Path אחד לכל המערכת

- קובץ חדש בשורש: `app-base.ts` — `export const BASE = '/multi-click/';` (מקור יחיד).
- `vite.config.ts`: לייבא את `BASE` במקום הקבוע המקומי. שאר תצורת ה־PWA ללא שינוי (`navigateFallback: 'index.html'` נפתר יחסית ל־Scope; לאמת ב־`dist/sw.js`).
- הבסיס זהה בפיתוח, ב־Preview וב־Production, כדי שהבדיקות המקומיות יבדקו בדיוק את מה שמתפרסם. כתובות מקומיות משתנות ל־`http://localhost:5173/multi-click/` ו־`http://localhost:4174/multi-click/` — לעדכן את **פקודות הרצה** ב־CLAUDE.md.
- לבדוק שאין נתיב מוחלט לשורש בקוד (`grep` על `"/`, `url(/`) — נכסים מיובאים דרך Vite כבר מקבלים Base.

## 2. התאמת הבדיקות ל־Base Path

- `playwright.config.ts`: `baseURL: http://localhost:4173${BASE}`; `webServer.url` בהתאם.
- כל `page.goto('/#/x')` ← `page.goto('#/x')`, ו־`goto('/')` ← `goto('./')` (כתובת יחסית ל־baseURL).
- `e2e/support/staticServer.ts`: `url` מחזיר `http://localhost:<port>${BASE}`; בקשה מחוץ ל־`BASE` מחזירה 404 (כך נתיב שגוי לשורש ייכשל בבדיקה); `BASE` עצמו → `index.html`.
- `e2e/pwa.spec.ts`: ציפיות `start_url`, `scope`, `id` = `BASE`; בדיקת ה־Scope של ה־Service Worker = `BASE`.
- בדיקה חדשה (ב־`navigation.spec.ts` או `layout.spec.ts`): בטעינה מלאה ו־Refresh של שלושת המסכים, כל הבקשות הן לאותו Origin ומתחת ל־`BASE`, וללא תשובות 404.

## 3. Workflow — `.github/workflows/deploy.yml`

Workflow אחד, שלושה Jobs:

- **Triggers:** `pull_request` (לכל ענף יעד), `push` ל־`main`, `workflow_dispatch`.
- **הרשאות ברירת מחדל:** `contents: read` בלבד.
- **Job `test`** (`ubuntu-latest`):
  1. `actions/checkout`, `actions/setup-node` עם `node-version-file: .nvmrc` ו־`cache: npm`.
  2. `npm ci`.
  3. `npx playwright install --with-deps chromium webkit`.
  4. `npm run typecheck`, `npm test`, `npm run test:e2e` (כולל בדיקות ה־PWA על שני Builds).
  5. `npm run build` אחרון, עם `APP_BUILD_ID: ${{ github.sha }}` — זה ה־`dist` שמתפרסם.
  6. רק ב־Push ל־`main`: `actions/configure-pages` ו־`actions/upload-pages-artifact` (`path: dist`).
  7. בכשל: העלאת `playwright-report`/`test-results` כ־Artifact קצר־מועד (`retention-days: 7`) לצורך אבחון בלבד.
- **Job `deploy`:** `needs: test`; `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` (וגם `workflow_dispatch` מ־`main`); `environment: github-pages` עם `url` מתוצאת הפריסה; הרשאות `pages: write`, `id-token: write`; `actions/deploy-pages`. `concurrency: { group: pages, cancel-in-progress: false }`.
- **Job `smoke`:** `needs: deploy`; מריץ את `e2e/public-smoke.spec.ts` (סעיף 4) ב־Chromium מול הכתובת הציבורית.
- **גרסאות Actions:** הגרסה הראשית (major) היציבה העדכנית של כל Action רשמי, נבדקת בדפי ה־Releases הרשמיים בזמן הבנייה ומקובעת בקובץ. Node.js מ־`.nvmrc` (24.22.0) — אותו patch כמו בפיתוח.
- ללא Secrets, ללא Personal Access Token, ללא `.env`. `GITHUB_SHA` אינו סוד.

## 4. בדיקת Smoke בכתובת הציבורית — `e2e/public-smoke.spec.ts`

- רצה רק כשמוגדר `SMOKE_URL` (אחרת `test.skip`), דרך קובץ תצורה נפרד `playwright.smoke.config.ts` (Chromium, בלי `webServer` ובלי `globalSetup`) וסקריפט `npm run test:smoke`.
- בודקת: HTTPS; שלושת המסכים נפתחים דרך Hash Routes, כולל Refresh; איור הבית ושלושת האווטארים נטענים; Manifest עם `start_url`/`scope`/`id` = `/multi-click/`; Service Worker פעיל ב־Scope `/multi-click/`; `<meta name="app-build">` שווה ל־Commit הצפוי (`EXPECTED_BUILD` מה־Workflow); אחרי הכנה — ניתוק רשת (`context.setOffline`) ו־Reload מציגים את שלושת המסכים.
- הבדיקה **קוראת בלבד** ואינה יוצרת פרופילים בכתובת הציבורית (דפדפן נקי של Playwright, ללא נתוני ילדים).
- אפשר להריץ גם מקומית: `SMOKE_URL=https://sharoltastyle-web.github.io/multi-click/ npm run test:smoke`.

## 5. זיהוי הגרסה המפורסמת ושחזור

- ה־Commit המפורסם: ב־`<meta name="app-build">` של האתר, וב־GitHub ← Actions/Deployments.
- **ADR-10** ב־ARCHITECTURE.md: Base Path קבוע, מבנה ה־Workflow, גרסאות ה־Actions, ה־Smoke, ודרך שחזור:
  - שחזור = `git revert` של ה־Commit הבעייתי ו־Push ל־`main` (פריסה חוזרת דרך אותו Workflow), לא העלאה ידנית.
  - מותר לחזור רק לקוד שתומך ב־Schema הנוכחי (גרסה 2) ומעלה; אין Downgrade של IndexedDB. אם הקוד הישן אינו תואם — תיקון קדימה.
  - אפשר גם להריץ ידנית את ה־Workflow (`workflow_dispatch`) על `main` לפריסה מחדש.
- לציין: נתוני localhost אינם עוברים לכתובת הציבורית (Origin שונה); נתוני Safari ו־PWA מותקן ב־iOS עשויים להיות נפרדים.

## 6. הוכחת CI/CD אמיתית (דורש אישור Push)

1. **Push ל־`main`** (אחרי אישור): ה־Workflow רץ; `test` ← `deploy` ← `smoke` עוברים; הכתובת נפתחת. תיעוד: מספר הריצה, Commit, וזמן.
2. **PR שנכשל:** ענף בדיקה זמני (למשל `ci-check-failing`) עם בדיקה שנכשלת בכוונה, ו־PR ל־`main`. מצופה: `test` נכשל, `deploy` לא רץ, האתר נשאר על ה־Commit הקודם (נבדק דרך `app-build`). לאחר מכן סגירת ה־PR ללא מיזוג; מחיקת הענף — רק באישור.
3. **PR תקין:** אפשר באותו ענף אחרי תיקון הבדיקה — `test` עובר, `deploy` מדולג (אין פרסום מ־PR).

## 7. עדכון גרסה בכתובת הציבורית

- אחרי הפריסה הראשונה: לפתוח את האתר, להתחיל תרגיל, לבצע Push נוסף (שינוי קטן ולגיטימי — למשל עדכון התיעוד שב־ADR-10, כדי לא לשנות התנהגות מוצר) ולוודא שהדף הפתוח אינו מבצע Reload ושהתרגיל לא נקטע; אחרי סגירת כל החלונות ופתיחה — `app-build` החדש מוצג והתוצאות נשמרות.
- נבדק בדפדפן המובנה (Desktop) ובמכשיר אמיתי אחד לפחות.

## 8. בדיקות Regression

- `npm run check` מקומית ובו־זמנית ב־CI (Chromium + WebKit; PWA ב־Chromium).
- בדיקה ידנית שלי בכתובת הציבורית בדפדפן המובנה ברוחב מובייל: שלושה מסכים בלבד, סדר רכיבים מול DESIGN וה־Mockups, RTL, טקסט ללא חיתוך, גלילה, Focus, Labels ומשוב; תרחיש מלא — שני פרופילים, תרגול בשני המצבים, טעות ורמז, הצלחה והמשך ידני, התקדמות נפרדת, סגירה ופתיחה. צילומי מסך כראיה. (הנתונים נוצרים בדפדפן הבדיקה בלבד.)
- סריקה שאין סודות או נתוני ילדים ב־Repository ובלוגים של ה־CI.

## 9. רשימת בדיקה למכשירים אמיתיים (למשתמשת)

לכל מכשיר — Android/Chrome ו־iPhone/Safari:
1. פתיחת הכתובת, המתנה להודעה „האפליקציה מוכנה לשימוש גם בלי אינטרנט”.
2. התקנה: Android — „התקנת אפליקציה”/„הוספה למסך הבית”; iPhone — שיתוף ← „הוספה למסך הבית”.
3. פתיחה מהאייקון: שם ואייקון נכונים, נפתח בלי שורת כתובת.
4. יצירת פרופיל ותרגול כמה תרגילים.
5. מצב טיסה ← סגירה ופתיחה מהאייקון ← שלושת המסכים, תרגול והתקדמות עובדים.
6. סגירה ופתיחה חוזרת ← הפרופיל והתוצאות קיימים.

## קבצים

| קובץ | פעולה |
| --- | --- |
| `app-base.ts` | חדש — Base Path יחיד |
| `vite.config.ts` | שימוש ב־`BASE` המשותף |
| `playwright.config.ts` | `baseURL` עם Base Path |
| `playwright.smoke.config.ts` | חדש — Smoke לכתובת הציבורית |
| `e2e/*.spec.ts` | כתובות יחסיות; ציפיות Manifest/Scope; בדיקת נתיבים תחת Base |
| `e2e/support/staticServer.ts` | הגשה תחת Base Path |
| `e2e/public-smoke.spec.ts` | חדש |
| `.github/workflows/deploy.yml` | חדש |
| `package.json` | סקריפט `test:smoke` |
| `tsconfig.node.json` | הכללת הקבצים החדשים בשורש אם נדרש |
| `CLAUDE.md` | עדכון כתובות ההרצה המקומיות |
| `spec/ARCHITECTURE.md` | ADR-10 |
| `spec/MILESTONES.md` | 🟡 בסיום |

אין שינוי בקוד המסכים, ב־Domain, ב־Persistence או ב־Schema.

## מיפוי ל־Definition of Done

| תנאי | איך מוכח |
| --- | --- |
| HTTPS, שלושה מסכים ונכסים תחת נתיב Project Pages ו־Refresh | Smoke ב־CI + בדיקה בדפדפן המובנה |
| Push ל־main בונה ומפרסם; PR אינו מפרסם | ריצות Actions אמיתיות (סעיף 6) |
| כשל חוסם Deployment | PR עם בדיקה שנכשלת; `app-build` לא השתנה |
| Manifest, start_url, scope ו־SW מהכתובת הציבורית | Smoke + בדיקת Manifest |
| מכשירי Android ו־iOS אמיתיים | רשימת סעיף 9 — דיווח המשתמשת; לא בוצע = חסר |
| תרחיש מלא | בדיקה ידנית בכתובת הציבורית + e2e |
| עדכון גרסה לא קוטע ולא מוחק | סעיף 7 |
| Schema | אין שינוי — מדווח שאין Migration |
| עיצוב מול DESIGN | צילומי מסך מהכתובת הציבורית |
| אין סודות/נתוני ילדים/שירותים חיצוניים | סריקה + לוגי CI + בדיקת בקשות רשת |
| כתובת, Commit, תוצאות ומגבלות מוצגים | סיכום הבנייה |

## הערה לבנייה

הבנייה תתבצע בשני שלבים: (א) כל השינויים המקומיים ובדיקתם מקומית — בלי Commit; (ב) עצירה לבקשת אישור לפני Commit/Push ול־PR הבדיקה, ובמקביל הדרכת המשתמשת להפעלת Pages. ה־🟡 יסומן רק אחרי שהפריסה האמיתית וה־Smoke עברו.
