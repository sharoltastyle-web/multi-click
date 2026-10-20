# תוכנית Milestone 2 — פרופיל מקומי וכניסה לחוויה

מבוסס על `MILESTONES.md` (M2), `PRD.md` (F1, F5, Edge Cases), `ARCHITECTURE.md` (סעיפים 2–5, 7–8, ADR-1–ADR-4), `DESIGN.md` והתמונות `wireframes.png`, `mockups.png`, `style-guide.png`.

## מטרה

ילד יכול ליצור פרופיל (כינוי + אווטאר), לראות אותו גם בביקור הבא, לבחור בו ולהיכנס למסך הלימוד, שבו מוצגים הכינוי והאווטאר שלו. מסך הבית ומסך האודות מלאים ומעוצבים, עם האיורים מתיקיית `assets`.

## מחוץ לטווח של M2 (לא לבנות)

- תרגול, Radio/Select, שדה תשובה, משוב ורמז, טבלת `ExerciseResult` — M3.
- גרף וסיכום התקדמות — M4. במסך הלימוד נשארת רק הכותרת „ההתקדמות שלי”, בלי נתוני דוגמה.
- עריכה, מחיקה או איפוס של פרופילים — מחוץ לטווח לפי ה־PRD.
- זכירת הפרופיל הפעיל אחרי Refresh/סגירה — לא נדרש (ARCHITECTURE סעיף 4). אחרי Refresh בוחרים שוב בבית.
- PWA, Manifest, אייקוני האפליקציה (`app-icon.png`) ו־Precache — M5.
- GitHub Pages ו־Workflow — M6.

## מצב קיים (מ־M1)

- שלושה Hash Routes, `resolveRoute` מפנה `learn` ללא פרופיל פעיל לבית.
- `ActiveProfileContext` מחזיק `activeProfileId: string | null` בזיכרון בלבד.
- רכיבי בסיס: `Button`/`ButtonLink`, `TextField`, `ScreenTitle`, `MathExpression`, `BottomNav`.
- המסכים הם שלד: כותרת + כפתור בלבד.
- Vitest (jsdom) ו־Playwright (Chromium Pixel 7 + WebKit iPhone 13, על Production Build).

## תלויות חדשות

| חבילה | סוג | למה |
| --- | --- | --- |
| `dexie` | Runtime | IndexedDB לפי ARCHITECTURE |
| `fake-indexeddb` | Dev | IndexedDB מדומה לבדיקות Vitest ב־jsdom |
| `sharp` | Dev | כיווץ האיורים מתיקיית `assets` (וב־M5 גם יצירת האייקונים) |

- גרסאות Stable מדויקות (ללא `^`), לבדוק ב־`npm view <pkg> version` לפני ההתקנה. עדכון `package-lock.json` ו־`npm ci` תקין.
- אין `.env` — אין צורך בהגדרות או מפתחות ב־M2.

## איורים — כיווץ והכנה

- סקריפט `scripts/optimize-images.mjs` (מריצים ב־`npm run images`) קורא מ־`assets/` וכותב ל־`src/assets/images/`:
  - `hero.webp` — רוחב 960px (מקור 1200×700).
  - `header-bg.webp` — רוחב 960px (מקור 1200×400).
  - `avatar-1.webp`, `avatar-2.webp`, `avatar-3.webp` — 256×256 (מקור 512×512; מוצגים עד ~96px, כך שגם מסכי Retina חדים).
  - WebP באיכות ~80; בדיקה חזותית שאין פגיעה נראית באיכות.
- הקבצים המכווצים נשמרים ב־Repository (כך ש־`npm ci` + Build לא תלויים בהרצת sharp ב־CI). המקורות ב־`assets/` לא משתנים.
- הקבצים מיובאים ב־`import` מתוך הקוד, כך ש־Vite מוסיף Content Hash ואורז אותם מקומית — אין בקשות לשרת חיצוני.
- `app-icon.png` לא נוגעים בו ב־M2.
- ADR חדש ב־ARCHITECTURE.md: כיווץ האיורים ל־WebP באמצעות sharp וסקריפט חד־פעמי, והקבצים המכווצים נשמרים ב־Repository.

## נתונים — Persistence (Dexie)

### מבנה
```
src/persistence/
  db.ts                 (Dexie: שם 'kefel-bekef-db', version(1), versionchange)
  profileRepository.ts  (listProfiles, createProfile — הממשק היחיד שהרכיבים משתמשים בו)
  profileRepository.test.ts
  db.test.ts
```

### Schema
- Database: `kefel-bekef-db` (שם קבוע, ARCHITECTURE סעיף 4).
- `version(1).stores({ profiles: 'id' })` — Primary Key בלבד; אין אינדקס על כינוי (כינויים כפולים מותרים).
- טיפוס `Profile`: `{ id: string; nickname: string; avatarId: AvatarId; createdAt: number }`.
- **מנגנון Version Upgrades:** כל שינוי עתידי מתווסף כ־`version(N)` חדש עם `upgrade()` Additive, בלי למחוק את הגדרות הגרסאות הקודמות ובלי `delete()` של ה־Database. הערה בקוד מסבירה את הכלל. טבלת התוצאות תתווסף ב־M3 כ־`version(2)`.
- `db.on('versionchange')` — סוגר את החיבור הישן (כדי לא לחסום שדרוג בחלון אחר). `on('blocked')` — מוצגת הודעת שגיאת שמירה (ראה למטה), בלי מחיקת נתונים.

### Repository
- `listProfiles(): Promise<Result<Profile[]>>` — ממוין לפי `createdAt` עולה.
- `createProfile(input): Promise<Result<Profile>>` — `id` מ־`crypto.randomUUID()`, `createdAt` מ־`Date.now()`, `nickname` אחרי `trim()`. מחזיר את הרשומה רק אחרי שה־`add` הסתיים בהצלחה.
- `Result<T> = { ok: true; value: T } | { ok: false; error: 'storage' }` — כל שגיאת IndexedDB (פתיחה, Quota, כתיבה) הופכת ל־`error: 'storage'`. לא זורקים חריגה לרכיבים ולא מוחקים נתונים.
- הרכיבים לא פונים ל־Dexie ישירות — רק דרך ה־Repository (ARCHITECTURE סעיף 2).

## Domain — אווטארים ו־Validation

```
src/domain/
  avatars.ts            (רשימת האווטארים המובנים)
  profileValidation.ts  (validateNewProfile — פונקציה טהורה)
  profileValidation.test.ts
  multiplicationTable.ts (יצירת שורות 1–10 לטבלת האודות)
  multiplicationTable.test.ts
```

- `avatars.ts`: `AvatarId = 'avatar-1' | 'avatar-2' | 'avatar-3'`, ולכל אחד קובץ התמונה ו־`alt` בעברית לפי DESIGN (ילד עם כובע כחול / ילדה עם שיער חום / ילד). התמונה נבחרת רק מהרשימה הזו (ARCHITECTURE סעיף 8).
- `validateNewProfile(nickname, avatarId)`:
  - כינוי ריק או רווחים בלבד ← „יש להקליד כינוי”.
  - לא נבחר אווטאר / ערך שאינו ברשימה ← „יש לבחור אווטאר”.
  - שתי השגיאות יכולות להופיע יחד; כל אחת ליד השדה שלה.
- אורך כינוי מרבי: `maxLength={20}` בשדה, כדי שהכינוי לא ישבור את כרטיס הפרופיל (הגבלת תצוגה בלבד; ה־PRD לא מגדיר אורך).
- `multiplicationTable.ts`: מחזיר מערך 10×10 של מכפלות `row × col` (1–10) — הטבלה מחושבת ולא מוקלדת ידנית.

## פרופיל פעיל (Context)

- `ActiveProfileContext` משתנה להחזיק את אובייקט הפרופיל: `activeProfile: Profile | null` ו־`selectProfile(profile | null)`. הבחירה נעשית לפי `id` (ARCHITECTURE סעיף 5); הכינוי לא משמש כמפתח.
- `AppShell` מעביר ל־`useHashRoute` את `activeProfile !== null` — לוגיקת ה־redirect מ־M1 לא משתנה.
- זיכרון בלבד; אין שמירה ב־localStorage, ב־URL או ב־IndexedDB.

## מסך הבית

מלמעלה למטה, לפי DESIGN וה־Mockup:

1. **Hero** — `hero.webp` ברוחב מלא של עמודת התוכן, פינות מעוגלות בתחתית, `alt` תיאורי בעברית. הכותרת „כפל בכיף” (`ScreenTitle`) מוצגת מעל החלק העליון של האיור (שמיים), כמו ב־Mockup.
2. **„בחירת פרופיל”** (`h2`) ושורת כרטיסי פרופיל:
   - Grid של שתי עמודות, ממשיך לשורות נוספות כשיש יותר משני פרופילים; גלילה אנכית בלבד.
   - כל כרטיס הוא `<button aria-pressed>` עם אווטאר עגול וכינוי מתחתיו (טקסט React רגיל, ללא `dangerouslySetInnerHTML`). רקע Cream, מסגרת; כרטיס נבחר: רקע Cyan בהיר ומסגרת Cyan מודגשת.
   - לחיצה על כרטיס בוחרת את הפרופיל כפעיל.
   - אין פרופילים: הכותרת והשורה לא מוצגות, וכרטיס „פרופיל חדש” מופיע מיד אחרי ה־Hero.
   - בזמן טעינה ראשונית: לא מציגים „אין פרופילים” לפני שהקריאה הסתיימה.
3. **כרטיס „פרופיל חדש”** (`<form>`):
   - `TextField` „כינוי” (ריק, `maxLength=20`, `autocomplete="off"`).
   - „בחירת אווטאר” — קבוצת Radio אמיתית (`<fieldset>` + `<legend>` + `<input type="radio">` מוסתר ויזואלית) עם שלוש תמונות עגולות; הנבחרת מסומנת במסגרת Cyan עבה. ניווט מקלדת ו־Focus גלוי. כל אפשרות ≥ 48px.
   - כפתור Cyan „יצירת פרופיל” (`type="submit"`).
   - הודעות Validation מתחת לשדה הרלוונטי, מקושרות ב־`aria-describedby`, ו־`aria-invalid` על השדה.
   - **נעילה בזמן שמירה:** Guard סינכרוני (`useRef`) + `disabled` לכפתור, כדי שלחיצה כפולה מהירה לא תיצור שני פרופילים.
   - **הצלחה:** הפרופיל מתווסף לרשימה ונבחר אוטומטית כפעיל; הטופס מתאפס.
   - **כשל:** הודעה ב־`role="alert"`: „לא הצלחנו לשמור את הפרופיל במכשיר. אפשר לנסות שוב.” הטופס לא מתאפס, הפרופיל לא מתווסף לרשימה ולא נבחר.
4. **כפתור Coral „ללימוד לוח הכפל”** — כפתור (לא קישור):
   - עם פרופיל פעיל ← מעבר ל־`#/learn`.
   - בלי פרופיל פעיל ← נשארים בבית ומוצגת הנחיה ב־`role="status"`: „יש לבחור פרופיל לפני התרגול” (מבוסס על PRD F1). הניווט התחתון „לימוד” ממשיך להפנות לבית כמו ב־M1.
5. **כשל פתיחת/קריאת IndexedDB** (למשל גלישה פרטית חסומה): במקום הרשימה מוצגת הודעה ב־`role="alert"`: „לא ניתן לשמור פרופילים במכשיר הזה כרגע.” לא מוצג חיווי הצלחה; ניסיון יצירה יחזיר את הודעת הכשל של הטופס.

## מסך הלימוד (תוספת מצומצמת)

- `ScreenHeader` משותף ללימוד ולאודות: רקע `header-bg.webp` (Cover, ממורכז) מאחורי `ScreenTitle`.
- מתחת לכותרת, בצד ימין: אווטאר קטן עגול (כ־56px) וכינוי הפרופיל הפעיל, כמו ב־Mockup.
- שאר המסך נשאר כמו ב־M1: קו הפרדה וכותרת „ההתקדמות שלי”, בלי נתונים.

## מסך האודות

מלמעלה למטה:

1. `ScreenHeader` עם „אודות כפל בכיף”.
2. **טבלת לוח הכפל** — `<table>` אמיתי, `dir="ltr"` (סדר המספרים כמו בתמונה: × בפינה השמאלית העליונה, 1→10 משמאל לימין), עם `<caption>` מוסתרת ויזואלית „לוח הכפל 1–10”:
   - שורת כותרות עליונה `<th scope="col">` ברקע Cyan; עמודת כותרות `<th scope="row">` ברקע Sunshine; תא הפינה „×”.
   - תאים לבנים/Cream, מספרים Navy, מסגרת Navy חיצונית ופינות מעוגלות (`border-collapse: separate` + `overflow: hidden`).
   - 11 עמודות ב־~448px: גודל גופן ~15–16px, `font-variant-numeric: tabular-nums`; ללא גלילה אופקית ב־375px. אם ברוחב 320px היא לא נכנסת — עטיפה עם `overflow-x: auto` לטבלה בלבד, לא לעמוד.
3. **בלוק ההסבר** — שבע השורות מ־DESIGN, בדיוק בנוסח שם, מיושרות לימין, Heebo 18px. „7–8” מבודד ב־`<bdi>` כדי שלא יתהפך.
4. **„חזרה לבית”** — `ButtonLink` Cyan ל־`#/home` (קיים מ־M1).

## קבצים ליצור / לשנות

```
package.json, package-lock.json      (dexie, fake-indexeddb, sharp, script "images")
scripts/optimize-images.mjs          (חדש)
src/assets/images/*.webp             (חדש — תוצרי הסקריפט)
src/persistence/db.ts, profileRepository.ts (+ tests)          (חדש)
src/domain/avatars.ts, profileValidation.ts, multiplicationTable.ts (+ tests) (חדש)
src/app/ActiveProfileContext.tsx     (Profile במקום id)
src/app/AppShell.tsx                 (activeProfile !== null)
src/app/useProfiles.ts               (חדש — טעינת רשימה: loading/ready/error, ויצירה)
src/components/Avatar.tsx + .module.css            (חדש — תמונה עגולה לפי AvatarId)
src/components/ProfileCard.tsx + .module.css       (חדש)
src/components/NewProfileForm.tsx + .module.css    (חדש)
src/components/ScreenHeader.tsx + .module.css      (חדש — רקע header-bg + כותרת)
src/components/MultiplicationTable.tsx + .module.css (חדש)
src/screens/HomeScreen.tsx + HomeScreen.module.css (מלא)
src/screens/LearnScreen.tsx          (כותרת עם רקע + כינוי ואווטאר)
src/screens/AboutScreen.tsx + AboutScreen.module.css (מלא)
src/test-setup.ts                    (import 'fake-indexeddb/auto')
src/screens/*.test.tsx               (עדכון/חדש)
e2e/profiles.spec.ts, e2e/about.spec.ts (חדש)
e2e/navigation.spec.ts, e2e/layout.spec.ts (עדכון)
spec/ARCHITECTURE.md                 (ADR-5: כיווץ איורים)
spec/MILESTONES.md                   (🟡 ליד M2 בסיום)
```

## בדיקות

### Vitest (jsdom + fake-indexeddb)
- `profileValidation.test.ts`: כינוי ריק, רווחים בלבד, אווטאר חסר, אווטאר לא חוקי, שתי שגיאות יחד, קלט תקין (כולל `trim`).
- `multiplicationTable.test.ts`: כל 100 המכפלות 1–10 נכונות.
- `db.test.ts`: **יצירת Schema על Database ריק** — פתיחה ראשונה יוצרת את `kefel-bekef-db` בגרסה 1 עם טבלת `profiles`; סגירה ופתיחה מחדש שומרות את הנתונים (מדמה סגירת האפליקציה).
- `profileRepository.test.ts`: יצירה ושליפה; שני פרופילים עם אותו כינוי ← שני `id` שונים ושתי רשומות; מיון לפי `createdAt`; כשל `add` מדומה ← `{ ok: false }` ואין רשומה.
- `HomeScreen.test.tsx`: אין פרופילים ← רק טופס; שליחה ריקה ← הודעות Validation ואין רשומה; יצירה ← כרטיס חדש ונבחר; כשל Repository מדומה ← הודעת כשל ואין כרטיס; לחיצה כפולה מהירה ← רשומה אחת.
- `AboutScreen.test.tsx`: טבלה עם 10 שורות × 10 תאים, כותרות 1–10, ושבע שורות ההסבר.
- `LearnScreen.test.tsx`: מציג כינוי ואווטאר של הפרופיל הפעיל; עדיין בלי `%`.

### Playwright (Production Build, Chromium + WebKit)
- `profiles.spec.ts`:
  - Database ריק ← אין כרטיסי פרופיל, יש טופס; „ללימוד לוח הכפל” ← נשארים בבית עם ההנחיה.
  - שליחה עם כינוי ריק / בלי אווטאר ← הודעות, ואחרי Reload עדיין אין פרופילים.
  - יצירת שני פרופילים (אחד מהם עם אותו כינוי פעמיים — „נועה” ו„נועה”) ← שלושה כרטיסים נפרדים.
  - Reload ← הכרטיסים נשארים; סגירת ה־Context ופתיחת דף חדש באותו `storageState`/Context ← הכרטיסים נשארים.
  - בחירת פרופיל ← „ללימוד לוח הכפל” ← `#/learn` עם הכינוי והאווטאר הנכונים; חזרה לבית ובחירת הפרופיל השני ← הלימוד מציג את השני (גם כשהכינוי זהה — לפי האווטאר/ה־id).
  - כניסה ישירה ל־`#/learn` אחרי Reload ← חזרה לבית.
  - **כשל IndexedDB:** `page.addInitScript` שגורם ל־`indexedDB.open` להיכשל ← הודעת השגיאה מוצגת, וניסיון יצירה מציג כשל ואינו מוסיף כרטיס.
- `about.spec.ts`: 100 תאים עם המכפלות הנכונות; התמונה של `header-bg` נטענה (`naturalWidth > 0`); טקסט ההסבר; „חזרה לבית”.
- `layout.spec.ts` (הרחבה): בית (עם 0 ועם 3 פרופילים), לימוד (עם פרופיל פעיל) ואודות — RTL, אין גלילה אופקית ב־375px, התוכן האחרון מעל הניווט אחרי גלילה, כל התמונות נטענו מ־localhost בלבד, אין בקשות חיצוניות.
- `navigation.spec.ts`: עדכון בדיקת „learn ללא פרופיל” להתנהגות החדשה של כפתור הבית (נשארים בבית + הנחיה).

## בדיקה עצמית לפני סימון 🟡

1. `npm ci` עובר; `npm run images` מייצר את חמשת קובצי ה־WebP.
2. `npm run check` (TypeScript, Vitest, Build, Playwright) — הכול עובר.
3. `npm run dev` ובדיקה חזותית ברוחב 375px מול ה־Mockups: בית (סדר: כותרת+Hero ← בחירת פרופיל ← פרופיל חדש ← ללימוד), לימוד (כינוי+אווטאר), אודות (טבלה ← הסבר ← חזרה לבית); RTL, Focus, גלילה, איכות האיורים. סגירת השרת בסיום.
4. בדיקת DevTools ב־Application → IndexedDB: רק `kefel-bekef-db` עם `profiles`, שדות לפי ה־Data Model.
5. חיפוש ב־Repository: אין נתוני ילדים אמיתיים, אין CDN, אין שירותי ענן. שמות בבדיקות הם שמות דוגמה בלבד.
6. ADR-5 ב־ARCHITECTURE.md; 🟡 ליד M2 ב־MILESTONES.md. בלי commit.

## הערות על ה־Definition of Done

- „כל Migration שנוסף נבדק על נתוני דוגמה” — ב־M2 נוצרת רק גרסה 1, ולכן אין Migration. נבדקת יצירת Schema על Database ריק ושמירת נתונים בפתיחה חוזרת; הבדיקה הראשונה של Migration אמיתי (v1 → v2) תהיה ב־M3.
- „מסכי הבית והאודות נבדקו מול ה־DESIGN וה־Mockups” — בדיקה חזותית ידנית שלי + צילומי מסך שיוצגו בסיכום; בדיקות Playwright מכסות סדר רכיבים, RTL וגלילה.

## החלטות קטנות שהתוכנית מניחה (לאישור עם אישור התוכנית)

- פרופיל שנוצר נבחר אוטומטית כפעיל (חוסך לחיצה, ותואם למצב „נבחר” שב־Mockup).
- לחיצה על „ללימוד לוח הכפל” בלי פרופיל פעיל מציגה את ההנחיה „יש לבחור פרופיל לפני התרגול” במקום לא לעשות כלום.
- הגבלת כינוי ל־20 תווים, כדי שיתאים לכרטיס.
- הודעות הטקסט החדשות (Validation וכשל שמירה) נוסחו לפי רוח ה־PRD, כי ה־PRD לא קובע להן נוסח מדויק.
