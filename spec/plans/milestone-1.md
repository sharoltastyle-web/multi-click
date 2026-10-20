# תוכנית Milestone 1 — בסיס אפליקציה עובד וניווט

מבוסס על `MILESTONES.md` (M1), `ARCHITECTURE.md` (סעיפים 1–3, 9–10), `DESIGN.md` והתמונות `wireframes.png`, `mockups.png`, `style-guide.png`.

## מטרה

שלד אפליקציה רץ: React + TypeScript strict + Vite, שלושה Hash Routes (בית, לימוד, אודות), Bottom Navigation, Design Tokens וגופנים מקומיים, רכיבי בסיס, RTL עם בידוד LTR למתמטיקה, ותשתית בדיקות (Vitest + Playwright) — בלי נתונים, פרופילים או תרגול.

## מחוץ לטווח של M1 (לא לבנות)

- Dexie / IndexedDB, יצירת ובחירת פרופילים, טופס הפרופיל — M2.
- איורים מתיקיית `assets` (Hero, רקע כותרת, אווטארים) — M2. ב־M1 הכותרות מוצגות על משטח בהיר בלי תמונה.
- טבלת לוח הכפל וטקסט ההסבר המלא במסך האודות — M2.
- תרגול, משוב, גרף והתקדמות — M3–M4. אין להציג במסך הלימוד נתוני דוגמה (40%/60%/80%, „דני”) כנתוני משתמש.
- PWA, Manifest, Service Worker, אייקונים — M5.
- GitHub Pages, Workflow, `base` של Project Pages — M6. ב־M1 `base` נשאר `/`.

## מצב קיים

- אין עדיין קוד. קיימים `spec/`, `assets/`, `CLAUDE.md`, `.gitignore`.
- Git מקומי מחובר ל־`https://github.com/sharoltastyle-web/multi-click.git` — דרישת ה־Repository של M1 כבר מתקיימת; אין לשנות נראות שלו. Commit/Push רק לפי פקודת „דחיפה” של המשתמשת.
- מותקנים Node.js 24.22.0 ו־npm 11.19.1.

## הגדרת הפרויקט

- יצירה ידנית (לא `npm create` אינטראקטיבי) של `package.json` עם `"private": true`, `"type": "module"`, `"engines": { "node": ">=24 <25" }`.
- קובץ `.nvmrc` עם `24.22.0` (אותו patch ישמש ב־CI ב־M6).
- תלויות Runtime: `react`, `react-dom` (אותה גרסה בדיוק), `@fontsource/fredoka`, `@fontsource/heebo`.
- תלויות פיתוח: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@playwright/test`.
- גרסאות: Stable בלבד, מדויקות (ללא `^`). לפני ההתקנה לבדוק ב־`npm view vite-plugin-pwa peerDependencies` מהו טווח ה־Vite הנתמך, ולבחור Major של Vite שבתוכו (גם אם התוסף עצמו יותקן רק ב־M5). ליצור `package-lock.json` ולוודא ש־`npm ci` עובד.
- הורדת דפדפני Playwright: `npx playwright install chromium webkit` (קבצי בדיקה בלבד, לא נכנסים ל־Repository).
- להוסיף ל־`.gitignore` רק אם חסר משהו (כרגע `dist/`, `playwright-report/`, `test-results/`, `node_modules/` כבר קיימים). לא להסיר שורות.
- אין `.env` — לפי ARCHITECTURE אין צורך בקובץ env ב־M1.

### Scripts ב־`package.json`

| Script | פקודה |
| --- | --- |
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `preview` | `vite preview` |
| `typecheck` | `tsc -b --noEmit` (או `tsc -p` לכל tsconfig) |
| `test` | `vitest run` |
| `test:e2e` | `playwright test` |
| `check` | typecheck + test + build + test:e2e ברצף |

## קבצים ליצור

```
index.html
package.json, package-lock.json, .nvmrc
tsconfig.json, tsconfig.app.json, tsconfig.node.json
vite.config.ts            (React plugin + הגדרות Vitest: jsdom, setup file)
playwright.config.ts
src/
  main.tsx
  App.tsx
  app/
    routes.ts             (Route type, parseHash, resolveRoute — פונקציות טהורות)
    routes.test.ts
    useHashRoute.ts       (מאזין ל־hashchange, מבצע redirect עם location.replace)
    ActiveProfileContext.tsx  (profileId פעיל בזיכרון; ב־M1 תמיד null)
    AppShell.tsx + AppShell.module.css
  components/
    BottomNav.tsx + BottomNav.module.css
    NavIcons.tsx          (SVG פנימיים: בית, עמודות, מידע)
    Button.tsx + Button.module.css      (variant: primary=Coral, secondary=Cyan)
    TextField.tsx + TextField.module.css (תווית חיצונית, inputMode אופציונלי)
    ScreenTitle.tsx + ScreenTitle.module.css (טיפול קומיקס: מילוי צהוב, Outline וצל Navy)
    MathExpression.tsx + MathExpression.module.css (בידוד LTR)
    components.test.tsx
  screens/
    HomeScreen.tsx + .module.css
    LearnScreen.tsx + .module.css
    AboutScreen.tsx + .module.css
    LearnScreen.test.tsx
  styles/
    tokens.css            (CSS Custom Properties)
    global.css            (reset, body, גופנים, focus-visible)
e2e/
  navigation.spec.ts
  layout.spec.ts
```

## TypeScript

- `strict: true`, וגם `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`.
- `jsx: react-jsx`, `moduleResolution: bundler`, הצהרת טיפוסים ל־CSS Modules דרך `vite/client`.

## index.html

- `<html lang="he" dir="rtl">`, `<meta charset="UTF-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<title>כפל בכיף</title>`, `<meta name="theme-color" content="#13B9F2">`.
- אין קישורים ל־CDN או Google Fonts.

## ניווט (Hash Routes)

- Routes: `home` ← `#/home`, `learn` ← `#/learn`, `about` ← `#/about`.
- `parseHash(hash)` מחזיר Route או `null`. `resolveRoute(route, hasActiveProfile)`:
  - Hash ריק / לא מוכר ← `home`.
  - `learn` כש־`hasActiveProfile=false` ← `home`.
- `useHashRoute`: קורא את `location.hash` בטעינה וב־`hashchange`. כשהתוצאה שונה מה־Hash הנוכחי — `location.replace('#/home')` (replace ולא push, כדי ש־Back לא ייתקע בלולאת redirect).
- ניווט רגיל נעשה בקישורי `<a href="#/...">` — כך Back/Forward ו־Refresh עובדים מעצמם.
- אחרי מעבר מסך: גלילה לראש העמוד והעברת Focus לכותרת המסך (`tabIndex={-1}`) לנגישות.
- **השלכה ב־M1:** אין עדיין פרופיל פעיל, לכן לחיצה על „לימוד” או על „ללימוד לוח הכפל” תחזיר לבית. זו ההתנהגות שה־DoD דורש; המסך עצמו יהיה נגיש מ־M2.

## Active Profile Context

- Context קטן עם `activeProfileId: string | null` ו־setter. ב־M1 הערך תמיד `null` ואין UI שמשנה אותו. Provider מקבל ערך התחלתי אופציונלי — לשימוש בבדיקות רכיב בלבד (לא נשמר בשום מקום).

## App Shell ו־Layout

- עמודת תוכן אחת, `max-width` של כ־480px, ממורכזת במסך רחב; רקע `Cream`.
- `main` עם `padding-block-end` = גובה הניווט + `env(safe-area-inset-bottom)` + 16px, כדי שהניווט לא יכסה תוכן.
- Bottom Navigation: `position: fixed` לתחתית ה־Viewport, באותו רוחב כמו עמודת התוכן, רקע לבן וקו עליון דק.
- גלילה אנכית בלבד; `overflow-x` לא אמור להיווצר (נבדק ב־Playwright).

## Bottom Navigation

- `<nav aria-label="ניווט ראשי">` עם רשימה של שלושה קישורים בסדר ה־DOM: בית, לימוד, אודות. ב־RTL זה מציג „בית” מימין, „לימוד” במרכז, „אודות” משמאל — כמו ב־Wireframes/Mockups.
- אייקונים: בית, עמודות (bar chart), מידע (i) — לא ספר. SVG פנימי, `aria-hidden`, עם תווית טקסט.
- פריט פעיל: `aria-current="page"`, רקע Cyan בהיר עם פינות מעוגלות, אייקון ותווית ב־Cyan/Bold. מפרידים אנכיים דקים בין הפריטים.
- כל פריט לפחות 48px גובה.

## Design Tokens (`styles/tokens.css`)

- צבעים: `--color-navy #081B52`, `--color-cyan #13B9F2`, `--color-sunshine #FFE331`, `--color-coral #FF6849`, `--color-lime #B9F566`, `--color-lilac #CAB8F6`, `--color-cream #FFF9E7`, `--color-white #FFFFFF`. גוונים בהירים (למשל Cyan בהיר לפריט פעיל, אפור למצב disabled) נגזרים בעזרת `color-mix()` מצבעי הבסיס, בלי HEX חדשים „מומצאים”.
- טיפוגרפיה: `--font-display: 'Fredoka'`, `--font-body: 'Heebo'`; גדלים: display 32, heading 24, subheading 20, body 18 (line-height 1.5), button 20, math 40.
- מרווחים: `--space-1: 8px`, `--space-2: 16px`, `--space-3: 24px`, `--space-4: 32px`.
- Radius: `--radius-md: 16px`, `--radius-lg: 24px`. Outline: `--border-width: 2px` / `3px` בגוון Navy. צל: `--shadow-offset: 0 4px 0 var(--color-navy)`.
- `--touch-min: 48px`.

## גופנים מקומיים

- `@fontsource/fredoka` (משקלים 600, 700) ו־`@fontsource/heebo` (400, 700), מיובאים ב־`main.tsx`. Vite אורז את קובצי הגופן יחד עם האתר — אין בקשה לשרת חיצוני.
- לוודא ש־Fredoka כולל תת־קבוצה עברית בגרסת החבילה; אם לא — לעצור ולשאול (לא להחליף גופן בלי אישור).
- לתעד כ־ADR ב־ARCHITECTURE.md: גופנים מקומיים דרך חבילות Fontsource.

## רכיבי בסיס

- **Button:** רחב, פינות 16–24px, מסגרת Navy, צל `0 4px 0` Navy, טקסט Heebo Bold 20px, גובה ≥ 48px. `primary` = Coral, `secondary` = Cyan. מצב `disabled` אפור. Focus: טבעת Cyan חיצונית.
- **TextField:** תווית מעל השדה (מיושרת לימין) ומקושרת ב־`htmlFor`/`id`; רקע לבן, מסגרת Navy, פינות מעוגלות; Focus עם טבעת Cyan. תומך ב־`inputMode="numeric"`.
- **ScreenTitle:** `h1` ב־Fredoka, מילוי Sunshine, Outline Navy (`-webkit-text-stroke` + `paint-order`) וצל מוסט Navy; ממורכז.
- **MathExpression:** `<bdi dir="ltr">` (או `span` עם `dir="ltr"` ו־`unicode-bidi: isolate`), Bold 40px; גורמים Navy, `×` Cyan, `?` Coral. מקבל `a`, `b` כ־props.

## תוכן המסכים ב־M1 (שלד בלבד)

- **בית:** `ScreenTitle` „כפל בכיף”; כפתור ראשי Coral „ללימוד לוח הכפל” (קישור ל־`#/learn`). אזורי ה־Hero והפרופילים יתווספו ב־M2 — לא מציגים כרטיסי פרופיל מזויפים.
- **לימוד:** `ScreenTitle` „לוח הכפל”; כותרת אזור „ההתקדמות שלי” בלבד, בלי גרף ובלי מספרים. נגיש רק עם פרופיל פעיל (כלומר מ־M2).
- **אודות:** `ScreenTitle` „אודות כפל בכיף”; כפתור Cyan „חזרה לבית” (קישור ל־`#/home`). הטבלה וההסבר — M2.
- `TextField` ו־`MathExpression` נבנים ונבדקים בבדיקות רכיב, אך לא מוצגים במסכים עד שיהיה להם תוכן אמיתי (M2–M3).

## בדיקות

### Vitest (jsdom)
- `routes.test.ts`: כל שלושת ה־Hashes; Hash ריק; `#/xyz` ו־`#/learn/1` ← home; `learn` בלי פרופיל ← home; `learn` עם פרופיל ← learn.
- `components.test.tsx`: `MathExpression` מרנדר `3 × 4 = ?` בסדר הזה עם `dir="ltr"`; `TextField` מקשר תווית לשדה ומעביר `inputMode`.
- `LearnScreen.test.tsx`: עם Provider שמקבל `activeProfileId` מדומה — המסך מרנדר את הכותרת „לוח הכפל” ואת „ההתקדמות שלי”, ללא אחוזים.

### Playwright
- `webServer`: `npm run build && npm run preview` על פורט קבוע (בדיקה על Production Build, לא על Dev Server).
- Projects: Chromium עם מכשיר Pixel 7, WebKit עם iPhone 13 (תצוגת מובייל).
- `navigation.spec.ts`:
  - פתיחה ללא Hash ← `#/home`, „בית” עם `aria-current="page"`.
  - מעבר לאודות דרך הניווט ← כותרת „אודות כפל בכיף”, „אודות” פעיל.
  - Refresh על `#/about` נשאר באודות; Back חוזר לבית והפריט הפעיל מתעדכן.
  - `#/unknown` ← בית. `#/learn` (ללא פרופיל) ← בית.
  - תוויות הניווט בסדר: בית, לימוד, אודות, ו„בית” ממוקם ויזואלית מימין ל„אודות” (השוואת `boundingBox`).
- `layout.spec.ts` (בכל אחד מהמסכים הנגישים):
  - `document.documentElement.scrollWidth <= clientWidth` (אין גלילה אופקית / חיתוך).
  - לאחר גלילה לסוף, תחתית האלמנט האחרון ב־`main` נמצאת מעל הקצה העליון של הניווט.
  - `html` עם `dir="rtl"` ו־`lang="he"`.
  - אין בקשות רשת ל־Origin חיצוני (האזנה ל־`page.on('request')`).

## בדיקה עצמית לפני סימון 🟡

1. מחיקת `node_modules` והרצת `npm ci` — עובר.
2. `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` — כולם עוברים.
3. הרצת `npm run dev` ובדיקה חזותית בדפדפן ברוחב מובייל (375px): כותרות קומיקס, גופנים עבריים, ניווט, פריט פעיל, Focus, אין חיתוך. סגירת השרת בסיום.
4. חיפוש ב־Repository: אין כתובות CDN, אין שירותי ענן, אין שמות או נתוני ילדים.
5. עדכון `CLAUDE.md` → **פקודות הרצה**: dev = `npm run dev`, test = `npm test` ו־`npm run test:e2e`.
6. ADR לגופנים ב־ARCHITECTURE.md; סימון 🟡 ליד M1 ב־MILESTONES.md. בלי commit.

## מגבלות ידועות של השלד (לדווח למשתמשת)

- מסך הלימוד לא נגיש עדיין — כל ניסיון להיכנס אליו מחזיר לבית, כנדרש, עד שיהיו פרופילים (M2).
- המסכים מציגים כותרות וכפתורים בלבד; איורים, פרופילים, טבלת הכפל, תרגול וגרף יגיעו ב־M2–M4.
- האפליקציה עדיין לא ניתנת להתקנה ולא עובדת ללא אינטרנט (M5), ולא מפורסמת (M6).
