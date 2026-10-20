# תוכנית — Milestone 5: PWA מלאה לשימוש ללא אינטרנט

מבוסס על PRD.md (F5 — שורת האייפון, F6, Edge Cases „פתיחה ראשונה ללא אינטרנט”, „התקנת PWA אינה נתמכת”, „נתוני האתר נמחקו”), ARCHITECTURE.md (סעיף 6 „PWA, Offline ועדכונים”, סעיף 7, סעיף 9 „Development ו־Production”, טבלת האימות בסעיף 10, ADR-2/3/4/5), DESIGN.md (מסך אודות, קובצי האיורים, `app-icon.png`, צבעים), ועל הקוד הקיים אחרי M4.

## מטרה

האפליקציה ניתנת להתקנה (Manifest + אייקונים), וה־Service Worker מוריד מראש את כל הקבצים: שלושת המסכים, האיורים, האווטארים, האייקונים והגופנים. אחרי הכנה מלאה הכול עובד בלי אינטרנט — כולל יצירת פרופיל, תרגול, שמירה והתקדמות (הנתונים כבר נשמרים ב־IndexedDB מקומית). גרסה חדשה אינה מרעננת את הדף באמצע תרגול; היא נכנסת לתוקף אחרי סגירת כל החלונות ופתיחה מחדש. במסך האודות נוספת ההמלצה למשתמשי אייפון.

## החלטות שהתקבלו מהמשתמשת בתכנון (לא מוגדרות ב־spec)

1. **הודעת מוכנות:** כשההכנה הושלמה בפועל (בפעם הראשונה בלבד), מוצגת לכמה שניות הודעה קצרה: „האפליקציה מוכנה לשימוש גם בלי אינטרנט”, ואז נעלמת.
2. **הודעת הכנה חלקית:** „נדרש חיבור לאינטרנט להשלמת הטעינה הראשונית” (הנוסח מ־ARCHITECTURE) מוצגת כפס צר בצבע צהוב בהיר בראש כל אחד משלושת המסכים, עד שיש אינטרנט וההכנה מסתיימת.

שתי ההחלטות יתועדו ב־ADR. PRD ו־DESIGN לא ישתנו בלי בקשה.

## מצב קיים רלוונטי

- `vite.config.ts` עם `base: '/'` (ADR-4: נשאר `/` עד M6). אין עדיין `vite-plugin-pwa`, אין תיקיית `public/`.
- האיורים מכווצים ל־`src/assets/images/*.webp` ומיובאים מהקוד (ADR-5) — Vite אורז אותם עם Content Hash, ולכן ייכנסו ל־Precache דרך `globPatterns`.
- הגופנים מ־Fontsource נארזים כקובצי `woff2`/`woff` ב־`dist/assets` (ADR-3).
- `index.html` כבר עם `lang="he" dir="rtl"` ו־`theme-color`.
- `db.ts`: Schema גרסה 2; `versionchange` סוגר חיבור ישן. אין שינוי Schema ב־M5.
- Playwright רץ על Production Build דרך `vite preview` (Chromium Pixel 7 + WebKit iPhone 13).
- `AppShell.tsx` מרנדר `main` + `BottomNav`; אין עדיין אזור הודעות משותף.

**אין שינוי Schema ב־M5 ולכן אין Migration** — יודווח כך בסיום. בדיקת העדכון תוודא שהנתונים הקיימים נשמרים בין גרסאות.

## 1. תלויות

- `vite-plugin-pwa` (גרסה 2.0.0, שתומכת ב־Vite 8 לפי ADR-4) ו־`workbox-window` (ש־`virtual:pwa-register` משתמש בו) — גרסאות מדויקות ללא `^`, נעולות ב־`package-lock.json`. אם בזמן ההתקנה יתברר אי־התאמה ב־peerDependencies — עצירה ודיווח, בלי שדרוג Major.
- אין תלות חדשה בזמן ריצה מעבר לאלה; אין CDN.

## 2. אייקונים — הרחבת `scripts/optimize-images.mjs`

מ־`assets/app-icon.png` (1024×1024) נוצרים ל־`public/icons/` (נשמרים ב־Repository כמו ה־WebP, כדי שה־Build לא יהיה תלוי ב־sharp):

| קובץ | גודל | שימוש |
| --- | --- | --- |
| `pwa-192.png` | 192×192 | Manifest, `purpose: any` |
| `pwa-512.png` | 512×512 | Manifest, `purpose: any` |
| `maskable-512.png` | 512×512 | Manifest, `purpose: maskable` — האייקון מוקטן לכ־80% וממורכז על רקע, כדי שקצות ה־× לא ייחתכו בעיגול (DESIGN) |
| `apple-touch-icon.png` | 180×180 | `<link rel="apple-touch-icon">` ב־`index.html`, רקע אטום |
| `favicon-32.png` | 32×32 | `<link rel="icon">` |

צבע הרקע של ה־Maskable ושל אייקון Apple: צבע הרקע של האייקון עצמו (ייבדק בתמונה בזמן הבנייה); אם אינו אחיד — Cream `#FFF9E7`. התוצאה תיבדק חזותית (פתיחת הקבצים).

## 3. תצורת PWA — `vite.config.ts`

`VitePWA` עם:

- `registerType: 'prompt'`, `injectRegister: false` (הרישום נעשה בקוד, סעיף 4), `strategies: 'generateSW'`.
- **Manifest:** `name` ו־`short_name`: „כפל בכיף”; `lang: 'he'`, `dir: 'rtl'`, `display: 'standalone'`, `theme_color: '#13B9F2'`, `background_color: '#FFF9E7'`; `start_url`, `scope` ו־`id` נגזרים מ־`base` של Vite (היום `/`, ב־M6 `/<repository-name>/`) — ערך אחד בקובץ התצורה, בלי נתיבים קשיחים. האייקונים מסעיף 2.
- **Workbox:**
  - `globPatterns: ['**/*.{html,js,css,webp,png,woff2,webmanifest}']` — HTML, JS, CSS, האיורים והאווטארים, האייקונים והגופנים. רק `woff2` (כל הדפדפנים הנתמכים טוענים אותו; `woff` הוא גיבוי לדפדפנים ישנים ומיותר ב־Precache).
  - `cacheId: 'kefel-bekef'` — שמות Cache ייחודיים לאפליקציה.
  - `cleanupOutdatedCaches: true` — מוחק רק Caches ישנים של Workbox של האפליקציה; לא נוגע ב־IndexedDB.
  - `navigateFallback: 'index.html'` — טעינה מחדש ב־Offline מחזירה את ה־App Shell (Hash Routes ממילא תמיד על אותו מסמך).
  - `clientsClaim: true` — בהתקנה הראשונה הדף הנוכחי נשלט מיד, ולכן „מוכן” באמת אחרי ההכנה. `skipWaiting` **לא** מופעל: גרסה חדשה נשארת waiting.
  - אין `runtimeCaching` — אין בקשות חיצוניות בכלל.
- `devOptions` כבויים: ה־Service Worker פעיל רק ב־Build (ARCHITECTURE סעיף 9).
- **מזהה גרסה:** `transformIndexHtml` קטן שמוסיף `<meta name="app-build" content="...">` מתוך משתנה הסביבה `APP_BUILD_ID` (ברירת מחדל `local`). זה משנה את `index.html` בין Builds, ולכן נוצר Service Worker חדש — נחוץ לבדיקת העדכון, ומשמש בהמשך ב־M6 לזיהוי ה־Commit. אינו סוד.

## 4. רישום ומצב ה־PWA — `src/pwa/`

**`src/pwa/pwaStatus.ts`** — פונקציה טהורה שמחליטה מה להציג (נבדקת ב־Vitest):

```ts
type PwaStatus = 'unsupported' | 'preparing' | 'ready' | 'justReady' | 'needsConnection';
```

- `unsupported` — אין `serviceWorker` בדפדפן: לא מציגים כלום, האתר עובד בדפדפן כרגיל (Edge Case „התקנה אינה נתמכת”).
- `preparing` — ההכנה רצה ויש אינטרנט: לא מציגים כלום.
- `justReady` — `onOfflineReady` נקרא (ההתקנה הראשונה הושלמה וה־Precache מלא, והדף נשלט): מציגים את הודעת המוכנות לכמה שניות ← `ready`.
- `ready` — כבר הייתה הכנה בעבר (יש Service Worker פעיל שולט בדף): לא מציגים כלום.
- `needsConnection` — ההכנה לא הושלמה **וגם** אין רשת (`navigator.onLine === false` / אירוע `offline`) או שההתקנה נכשלה (שגיאת רישום, או ה־Worker שבהתקנה הפך ל־`redundant`): מציגים את הפס.

**`src/pwa/usePwaStatus.ts`** — Hook שרושם את ה־Service Worker פעם אחת דרך `registerSW` מ־`virtual:pwa-register`:

- `onOfflineReady` ← `justReady`.
- `onNeedRefresh` ← **לא עושים כלום**: אין מסך עדכון, אין `updateSW()`, אין Reload (ARCHITECTURE סעיף 6). הגרסה הממתינה תופעל אחרי סגירת כל החלונות.
- `onRegisterError` ← אם עדיין לא מוכן: `needsConnection`.
- מאזין ל־`online`/`offline`. כשחוזרת הרשת ומצב `needsConnection` — `registration.update()` (או רישום מחדש) כדי לנסות שוב; הפס נעלם רק כשההכנה באמת הושלמה.
- אין `localStorage`: הודעת המוכנות מוצגת „פעם אחת” באופן טבעי, כי `onOfflineReady` נקרא רק בהתקנה הראשונה.
- הקוד משתמש רק ב־`import.meta.env.BASE_URL` (דרך התוסף) לנתיב ה־Service Worker — אין נתיב קשיח לשורש.

## 5. ממשק — הודעות PWA

**`src/components/PwaBanner.tsx` (+ `.module.css`)** — רכיב אחד בראש `AppShell`, מעל `main`, בזרימה הרגילה של הדף (לא שכבה צפה) כדי שלא יכסה תוכן או את הניווט:

- `needsConnection` ← פס צר על רקע צהוב בהיר (כמו משוב „עוד ניסיון” ב־DESIGN), טקסט Navy, אייקון קטן + הטקסט „נדרש חיבור לאינטרנט להשלמת הטעינה הראשונית”. `role="status"`. מוצג בכל שלושת המסכים, כל עוד המצב נמשך.
- `justReady` ← פס צר על רקע Lime (כמו משוב הצלחה) עם „האפליקציה מוכנה לשימוש גם בלי אינטרנט”, `role="status"`; נעלם אחרי כ־5 שניות.
- אחרת לא מרונדר כלום.
- הטקסטים כקבועים (`PWA_NEEDS_CONNECTION_MESSAGE`, `PWA_READY_MESSAGE`) לשימוש בבדיקות. עיצוב לפי ה־Tokens הקיימים (Heebo, Radius, Outline Navy). מיושר לימין, ללא חיתוך במובייל.

`AppShell.tsx` — מוסיף `<PwaBanner />` בראש ה־shell. אין שינוי במסכים עצמם מלבד האודות.

## 6. מסך האודות — שורת האייפון

`AboutScreen.tsx` — פסקה אחרונה בבלוק הטקסט, אחרי „התוצאות נשמרות במכשיר לכל פרופיל.”, בנוסח המדויק של DESIGN:

> באייפון מומלץ להוסיף את האפליקציה למסך הבית, כדי שהתוצאות יישמרו לאורך זמן.

אותו סגנון של שאר הפסקאות, מיושר לימין. עדכון `AboutScreen.test.tsx` ו־`e2e/about.spec.ts` (קיום הטקסט, יישור לימין, אין גלילה אופקית/חיתוך במובייל).

## 7. `index.html`

- `<link rel="apple-touch-icon" href="...">` ו־`<link rel="icon">` (נתיבים יחסיים ל־`base`, ש־Vite משכתב).
- ה־Manifest מוזרק אוטומטית על ידי התוסף.
- `<meta name="apple-mobile-web-app-title" content="כפל בכיף">` כדי שהשם במסך הבית באייפון יהיה נכון.

## 8. עדכון ונתונים

- אין שינוי Schema. `db.ts` לא משתנה; `versionchange` הקיים ממשיך לסגור חיבור ישן אם בעתיד יתווסף Schema.
- ניקוי Cache מוגבל ל־Caches של Workbox עם `cacheId` של האפליקציה. אין קוד שקורא ל־`indexedDB.deleteDatabase` או ל־`caches.delete` כללי.
- Rollback: מכיוון שאין שינוי Schema, אין סיכון Downgrade ב־M5. העיקרון (תיקון קדימה, ללא Downgrade) כבר מתועד ב־ARCHITECTURE סעיף 7.

## 9. בדיקות

### Vitest

- `src/pwa/pwaStatus.test.ts` — כל המעברים: אין תמיכה ← כלום; הכנה + אונליין ← כלום; `onOfflineReady` ← `justReady`; כשל התקנה / אופליין לפני מוכנות ← `needsConnection`; אופליין **אחרי** מוכנות ← אין פס; חזרת רשת ← ניסיון חוזר ונשאר עד מוכנות.
- `src/components/PwaBanner.test.tsx` — כל מצב מציג את הטקסט הנכון או כלום; הודעת המוכנות נעלמת אחרי הזמן (Fake Timers).
- `AboutScreen.test.tsx` — שורת האייפון.
- `virtual:pwa-register` מוחלף ב־Mock בבדיקות היחידה.

### Playwright — PWA על Build אמיתי (`e2e/pwa.spec.ts`)

הבדיקות רצות ב־Chromium בלבד (Playwright תומך ב־Service Workers רק ב־Chromium); בפרויקט WebKit הן מדולגות עם הסבר, והבדיקה ב־Safari באייפון אמיתי שייכת ל־M6. בדיקות ה־E2E הקיימות ממשיכות לרוץ בשני הדפדפנים.

**שרת בדיקה ייעודי — `e2e/support/staticServer.ts`:** שרת HTTP קטן של Node (`node:http`, ללא תלות חדשה) על פורט קבוע ב־localhost, שהבדיקה שולטת בו: אפשר **לעצור** אותו (ניתוק אמיתי בנוסף ל־`context.setOffline(true)`), **להחליף** את התיקייה שהוא מגיש (גרסה A ← גרסה B באותה כתובת), ו**להכשיל** קובץ מסוים (בדיקת הכנה חלקית). `globalSetup` בונה פעמיים: `APP_BUILD_ID=A` ל־`.pwa-builds/a` ו־`APP_BUILD_ID=B` ל־`.pwa-builds/b`. `.pwa-builds/` נוסף ל־`.gitignore`.

תרחישים:

1. **Manifest ואייקונים** — ה־Manifest נטען ותקין (שם, `lang`, `dir`, `display`, `start_url`/`scope`/`id` לפי `base`, אייקון 192/512/Maskable); כל אייקון מחזיר 200 בגודל הנכון; `apple-touch-icon` קיים. ה־Service Worker רשום עם Scope של כתובת האתר.
2. **הכנה מלאה ← Offline מלא** — פתיחה, המתנה להודעת המוכנות (והיא מופיעה רק אחרי שה־Worker פעיל ושולט בדף). עצירת השרת + `setOffline` + Reload ← שלושת המסכים נפתחים (`#/home`, `#/learn`, `#/about`); האיורים והאווטארים נטענו (`naturalWidth > 0`); הגופנים Fredoka ו־Heebo זמינים (`document.fonts.check`); יצירת פרופיל, תרגיל עם טעות ואז הצלחה, והגרף והסיכום מתעדכנים — הכול בלי רשת. Reload נוסף ב־Offline שומר את הנתונים.
3. **אין בקשות חיצוניות** — לאורך כל התרחיש נרשמות כל הבקשות; כולן לאותו Origin (אין CDN, Fonts או API חיצוניים).
4. **הכנה חלקית** — השרת מכשיל קובץ אחד מה־Precache ← אין הודעת מוכנות; ניתוק הרשת ← מוצג הפס „נדרש חיבור…”; חיבור מחדש ותיקון הקובץ ← ההכנה מסתיימת, הפס נעלם והודעת המוכנות מופיעה.
5. **מחזור עדכון בלי Reload** — גרסה A מוכנה, יצירת פרופיל ובדיקת תשובה שגויה (נשמרה); השרת עובר לגרסה B ומופעל `registration.update()` ← יש Worker ב־waiting; הדף **לא** נטען מחדש (סימון על `window` נשאר, אותו תרגיל ואותו רמז מוצגים, אפשר להמשיך ולפתור אותו). סגירת כל הדפים ופתיחת דף חדש ← `meta[name=app-build]` הוא B, והתוצאות שנשמרו בגרסה A מופיעות בהתקדמות.
6. **ניקוי Cache שומר נתונים** — אחרי המעבר ל־B: Caches של הגרסה הישנה נוקו, שמות ה־Caches כולם עם הקידומת `kefel-bekef`, ו־IndexedDB `kefel-bekef-db` עם הפרופיל והתוצאות קיים.
7. **כשל אחסון** — בגרסה המותקנת, הבדיקה הקיימת של כשל IndexedDB (פרופיל / שמירת תוצאה) עוברת גם כשהדף נשלט על ידי ה־Service Worker; אין מחיקת נתונים.

### מה **לא** נבדק אוטומטית (ויתועד)

- **כניסה ראשונה אי פעם ללא אינטרנט:** הדפדפן מציג את הודעת השגיאה שלו, כי קוד האתר עוד לא הורד — מגבלת פלטפורמה (ARCHITECTURE סעיף 6). אין מה לבדוק בתוך האפליקציה; יתועד בדיווח.
- התקנה בפועל במסך הבית באנדרואיד ובאייפון, ובדיקת Offline במכשיר אמיתי בכתובת HTTPS ציבורית — M6.

### בדיקה ידנית בסיום הבנייה

הרצת Build מקומי ב־Chrome: לשונית Application ← Manifest תקין ואפשרות „התקנה” זמינה; Service Worker פעיל; מצב Offline ותרגול מלא. צילום מסך של מסך האודות עם שורת האייפון במובייל.

## 10. תיעוד

- **ADR-9: PWA — Precache, הודעות מוכנות ומחזור עדכון** — רשימת ה־`globPatterns` (רק `woff2`), `clientsClaim` בלי `skipWaiting`, אין ממשק עדכון, `cacheId`, האייקונים ב־`public/icons` מתוך הסקריפט, שתי ההודעות שהמשתמשת בחרה ומיקומן, מזהה ה־Build ב־meta, ושרת הבדיקה הייעודי לבדיקות Offline ועדכון.
- `CLAUDE.md` — עדכון „פקודות הרצה” אם נוספה פקודה (למשל שהבדיקות כוללות עכשיו בניית שתי גרסאות; `npm run images` יוצר גם את האייקונים).

## קבצים

**חדשים:** `src/pwa/pwaStatus.ts`, `src/pwa/pwaStatus.test.ts`, `src/pwa/usePwaStatus.ts`, `src/components/PwaBanner.tsx`, `src/components/PwaBanner.module.css`, `src/components/PwaBanner.test.tsx`, `public/icons/*.png` (5 קבצים), `e2e/pwa.spec.ts`, `e2e/support/staticServer.ts`, `e2e/support/buildVersions.ts` (globalSetup).

**משתנים:** `package.json` / `package-lock.json`, `vite.config.ts`, `index.html`, `src/vite-env.d.ts` (טיפוסי `virtual:pwa-register`), `src/app/AppShell.tsx`, `src/screens/AboutScreen.tsx` + בדיקה, `e2e/about.spec.ts`, `playwright.config.ts` (globalSetup, PWA רק ב־Chromium), `scripts/optimize-images.mjs`, `.gitignore` (`.pwa-builds/`), `spec/ARCHITECTURE.md` (ADR-9), `spec/MILESTONES.md` (🟡 בסיום), `CLAUDE.md` (פקודות הרצה, אם צריך).

**ללא שינוי:** `db.ts` ו־Schema, הלוגיקה של תרגול והתקדמות, `base` (`/` עד M6).

## מיפוי ל־Definition of Done

| תנאי | איך מאומת |
| --- | --- |
| Manifest ואייקונים תקינים, Service Worker ב־Scope הנכון | Playwright תרחיש 1 + בדיקה ידנית ב־Chrome |
| Offline מלא אחרי הכנה: שלושה מסכים, פרופיל, תרגול, שמירה, התקדמות | תרחיש 2 |
| אין CDN / Fonts / API חיצוניים | תרחיש 3 |
| אין הודעת מוכנות כשה־Precache נכשל או טרם הסתיים | תרחיש 4 + Vitest של `pwaStatus` |
| הכנה חלקית מציגה הודעה; כניסה ראשונה ללא רשת מתועדת | תרחיש 4 + תיעוד המגבלה בדיווח וב־ADR-9 |
| שתי גרסאות: אין Reload בתרגיל; אחרי סגירה ופתיחה נטענת החדשה והתוצאות נשמרות | תרחיש 5 |
| כשל אחסון ועדכון Schema ללא מחיקת נתונים; אין Downgrade | תרחישים 6–7; אין שינוי Schema ב־M5 (ידווח) |
| שורת האייפון בנוסח DESIGN, לימין, ללא חיתוך | Vitest + `e2e/about.spec.ts` + צילום מובייל |
| בדיקות Offline ועדכון על Build ולא על Dev Server | שרת הבדיקה מגיש את `dist` של Build אמיתי |
| הצגת התוצר והבדיקות ועצירה לאישור | דיווח בסיום |
