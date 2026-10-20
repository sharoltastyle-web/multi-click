# תוכנית — Milestone 4: התקדמות אישית המבוססת על תוצאות אמת

מבוסס על PRD.md (F4, Edge Cases, User Flow „צפייה בהתקדמות”), ARCHITECTURE.md (סעיפים 2, 3 „RTL, קלט וגרף”, 4 „חישוב התקדמות”, בדיקות), DESIGN.md (מסך הלימוד, „גרף” ב־UI Style) וה־Mockup של מסך הלימוד, ועל הקוד הקיים אחרי M3.

## מטרה

באזור „ההתקדמות שלי” שבמסך הלימוד מוצגים גרף SVG של אחוז ההצלחה בניסיון הראשון לפי ימי תרגול (עד 7 האחרונים) וסיכום יומי בשתי שורות. הנתונים נגזרים בכל פעם מרשומות `ExerciseResult` השמורות של הפרופיל הפעיל, מתעדכנים אחרי שמירה מוצלחת ומתחלפים בהחלפת פרופיל. אין מסך נוסף ואין טבלת סיכום שמורה.

## מצב קיים רלוונטי

- `ExerciseResult` שמור עם `firstCheckLocalDate` (YYYY-MM-DD מקומי, נעול) ו־`firstAttemptCorrect` (נעול) — כל מה שהמדד צריך.
- `exerciseResultRepository.listResults(profileId)` כבר קיים (שאילתה לפי אינדקס `profileId`).
- `LearnScreen.tsx` מציג קו הפרדה וכותרת „ההתקדמות שלי” בלבד; `PracticePanel` מקבל `key={activeProfile.id}`.
- `usePractice` מקבל תוצאת שמירה מה־Repository (`saved` / `duplicate` / `alreadySolved` / `conflict` / `error`).
- `toLocalDateKey` קיים ב־`src/domain/exerciseResult.ts`.
- Design Tokens: `--color-cyan`, `--color-navy`, `--color-divider`, גופן Heebo.

**אין שינוי Schema ב־M4.** האינדקסים מ־M3 מספיקים (ADR-6), ולכן אין Migration נדרש — יודווח כך בסיום.

## 1. Progress Domain — `src/domain/progress.ts` (+ `progress.test.ts`)

פונקציות TypeScript טהורות, ללא React, DOM או Dexie.

```ts
interface DailyProgress {
  date: string;            // YYYY-MM-DD (firstCheckLocalDate)
  checkedCount: number;
  firstCorrectCount: number;
  accuracy: number;        // exact, 0–100; only exists when checkedCount > 0
}
```

- `aggregateDaily(results: ExerciseResult[]): DailyProgress[]` — קיבוץ לפי `firstCheckLocalDate` בלבד (לא לפי `firstCheckedAt`, כך ששינוי אזור זמן לא משנה שיוך). `checkedCount` = מספר רשומות, `firstCorrectCount` = רשומות עם `firstAttemptCorrect=true`, `accuracy = 100 × firstCorrect / checked` ללא עיגול. ממוין כרונולוגית. רק ימים עם רשומות נוצרים — אין ימי 0%.
- `lastPracticeDays(days, max = 7)` — 7 ימי התרגול האחרונים בלבד (לא 7 ימים קלנדריים).
- `todaySummary(days, todayKey)` — `{ checkedCount, firstCorrectCount, accuracy? }`; כשאין רשומות היום `accuracy` לא קיים (אין חלוקה באפס).
- `formatPercent(accuracy)` — עיגול לתצוגה בלבד (`Math.round`) + `%`.
- `formatShortDate('2026-10-17')` ← `17.10` (כמו ב־Mockup), בלי Date/UTC — פירוק המחרוזת בלבד.

**בדיקות (`progress.test.ts`):**
- 10 רשומות, 8 עם `firstAttemptCorrect=true` ← 10, 8, 80.
- רשומה עם `firstAttemptCorrect=false, solved=true, attemptCount=3` נספרת כטעות; רשומה שננטשה (`solved=false`) נכללת במכנה.
- אותם גורמים בשתי רשומות (id שונה) ← שני תרגילים.
- רשומות בימים 17.10 ו־19.10 בלבד ← שני ימים, אין 18.10 ו־0%.
- 9 ימי תרגול ← `lastPracticeDays` מחזיר את 7 האחרונים; הקלט לא משתנה.
- `todaySummary` ליום ללא רשומות ← 0, 0, ללא `accuracy`.
- חצות ואזור זמן: רשומה עם `firstCheckedAt` ב־23:59 ו־`firstCheckLocalDate` של אותו יום, ורשומה ש־`firstCheckedAt` שלה ב־UTC נופל ביום אחר — הקיבוץ לפי `firstCheckLocalDate` השמור בלבד.
- `formatShortDate`, `formatPercent` (למשל 2/3 ← 67%).

## 2. Persistence

אין שינוי ב־`db.ts`. `listResults` קיים; ב־M4 הוא עטוף בטיפול בשגיאה:

- `exerciseResultRepository.listResults` מחזיר `Result<ExerciseResult[]>` (אותו טיפוס של `profileRepository`) במקום לזרוק — כך שכשל קריאה יוצג בבירור.
- בדיקה ב־`exerciseResultRepository.test.ts`: רשומות של שני פרופילים ← כל אחד מקבל רק את שלו; כשל קריאה ← `ok: false`.

## 3. State — `src/app/useProgress.ts`

- `useProgress(profileId, { repository })` ← `{ status: 'loading' | 'ready' | 'error', days: DailyProgress[], reload() }`.
- טוען ב־mount ובכל שינוי `profileId`; תשובה מאוחרת של פרופיל קודם נזרקת (דגל `cancelled` / השוואת profileId שנלכד), כך שנתוני פרופיל אחר לעולם לא מוצגים.
- `reload()` קורא שוב ל־`listResults` ומחשב מחדש — אין מצב מצטבר בזיכרון שעלול לסטות מהנתונים השמורים.
- „היום” מחושב בזמן הרינדור עם `toLocalDateKey(Date.now())`.

**חיבור לתרגול:** `usePractice` ו־`PracticePanel` מקבלים prop אופציונלי `onResultSaved`, שנקרא רק כשהתוצאה היא `saved` (רשומה נוצרה או עודכנה). `error`, `duplicate` ו־`notSaved` אינם קוראים לו — כך שגיאת שמירה לא מתווספת לגרף. `LearnScreen` מעביר `reload` של `useProgress`.

## 4. ממשק — אזור „ההתקדמות שלי”

### `src/components/ProgressSection.tsx` (+ `.module.css`)
מקבל `status`, `days`, `todayKey`. מתחת לכותרת „ההתקדמות שלי” הקיימת:

| מצב | תצוגה |
| --- | --- |
| `loading` | מקום שמור בלבד (ללא טקסט מטעה) |
| `error` | „לא ניתן לטעון את ההתקדמות” (`role="alert"`), ללא גרף |
| אין ימי תרגול | „עדיין אין תוצאות. אפשר להתחיל לתרגל!” (PRD), ללא גרף וללא סיכום |
| יש נתונים | גרף + סיכום יומי |

**סיכום יומי** (HTML רגיל, ממורכז כמו ב־Mockup, `aria-live="polite"`):
- שורה 1: „היום: 10 תרגילים נבדקו” (ליחיד: „היום: תרגיל 1 נבדק”).
- שורה 2: „8 נכונים בניסיון הראשון · 80%”. המספר והאחוז בתוך `<bdi>` כדי שהסדר יישאר נכון ב־RTL.
- כשהיום לא תורגל אבל יש היסטוריה: „היום: עדיין לא נבדקו תרגילים” ושורה 2 לא מוצגת (אין אחוז מכנה אפס).

### `src/components/ProgressChart.tsx` (+ `.module.css`)
SVG מקומי, ללא ספריית Charts:
- `viewBox` קבוע (למשל 320×200) עם `width: 100%` — Responsive. ה־SVG ב־`dir="ltr"` כך שהזמן מתקדם משמאל לימין בתוך המסך ה־RTL.
- ציר Y: 0%–100% קבוע, קווי רשת דקים כל 20% (`--color-divider`) ותוויות כהות מימין לשמאל של הציר כמו ב־Mockup.
- ציר X: תאריכים בפורמט `17.10`. **ימי התרגול במרווחים שווים** (ARCHITECTURE, ADR-8). קווי רשת אנכיים דקים בכל נקודה.
- קו Cyan רציף (`--color-cyan`) בין הנקודות, נקודות עגולות Cyan ותווית אחוז כהה מעל כל נקודה.
- **יום אחד:** נקודה אחת במרכז הציר עם התאריך והאחוז, ללא קו — ובלי שום טקסט על מגמה.
- נגישות: `role="img"` ו־`aria-label` המתאר את הנתונים בטקסט (למשל „אחוז הצלחה בניסיון הראשון: 17.10 40%, 18.10 60%, 19.10 80%”). אין אנימציות או אפקטים תלת־ממדיים.

### `src/screens/LearnScreen.tsx`
- `useProgress(activeProfile.id)`; `ProgressSection` עם `key={activeProfile.id}`.
- `PracticePanel` מקבל `onResultSaved={reload}`.
- הסדר נשאר: תרגיל ← משוב ← קו הפרדה ← „ההתקדמות שלי” ← גרף ← סיכום. הגרף אינו מסתיר את התרגיל; גלילה מותרת, והמקום לניווט התחתון כבר שמור ב־AppShell.

## 5. בדיקות

### Vitest
- `progress.test.ts` — כמפורט בסעיף 1.
- `exerciseResultRepository.test.ts` — הפרדת פרופילים ב־`listResults` וכשל קריאה.
- `ProgressChart.test.tsx` — 3 ימים ← 3 נקודות ותוויות `40%`/`60%`/`80%` ו־`17.10`…; יום אחד ← נקודה אחת וללא `<polyline>`/`<path>` של קו; 9 ימים ← 7 נקודות; ריווח שווה וכל התוויות מוצגות גם אחרי הפסקה ארוכה; ציר 0%–100%.
- `ProgressSection.test.tsx` — ללא נתונים ← הודעת ה־PRD וללא `svg`; שגיאה ← הודעת שגיאה; יש נתונים בלי היום ← „היום: עדיין לא נבדקו תרגילים” וללא אחוז; יחיד/רבים.
- `LearnScreen.test.tsx` (fake-indexeddb) — מעודכן: אין יותר הנחת „אין `%`”; במקומה — פרופיל ריק ← הודעת „עדיין אין תוצאות”; פרופיל עם רשומות שנזרעו ← הסיכום מהרשומות; תשובה נכונה ← הסיכום מתעדכן; Repository שנכשל בשמירה ← הסיכום אינו משתנה.

### Playwright — `e2e/progress.spec.ts` (על Production Build, Chromium + WebKit)
זריעת רשומות ישירות ל־IndexedDB ב־`page.evaluate` (אחרי יצירת פרופיל דרך הממשק), ושימוש ב־`page.clock` לקביעת „היום”.
1. **80%:** פרופיל חדש ← „עדיין אין תוצאות…”. תרגול אמיתי של 10 תרגילים, 2 מהם עם טעות ראשונה ואז תיקון ← „היום: 10 תרגילים נבדקו”, „8 נכונים בניסיון הראשון · 80%”, נקודה אחת בגרף.
2. **ניסיונות חוזרים ונטישה:** טעות, טעות, הצלחה באותו תרגיל ← הספירה עולה ב־1 בלבד; טעות ואז מעבר לאודות וחזרה ← התרגיל במכנה, לא במונה.
3. **ימים חסרים ו־7 ימים:** זריעת 9 ימי תרגול לא רצופים ← 7 נקודות, התאריכים הנכונים, אין 0%; ספירת הרשומות ב־IndexedDB לא השתנתה.
4. **יום אחד:** נקודה אחת וללא קו.
5. **חצות ואזור זמן:** רשומה שנבדקה ב־23:59 ותוקנה אחרי חצות (עם `page.clock`) ← נשארת ביום הראשון; פתיחה מחדש עם `timezoneId` אחר בקונטקסט חדש עם אותן רשומות זרועות ← אותו שיוך ימים.
6. **הפרדת פרופילים:** תרגול בפרופיל א', מעבר לפרופיל ב' ← „עדיין אין תוצאות”; חזרה לא' ← הנתונים שלו. Reload ← אותה התקדמות.
7. **כשל שמירה:** `IDBObjectStore.prototype.put/add` זורקים ← „התוצאות לא נשמרו במכשיר”, הסיכום והגרף לא משתנים.
8. **אין נתוני Mockup קבועים:** בפרופיל חדש לא מופיעים `17.10`, `40%`, `10 תרגילים`.

### חזותי
צילומי מסך במובייל (Pixel 7, iPhone 13) של: אין נתונים, יום אחד, 3 ימים (מול ה־Mockup), 7 ימים, ימים מרוחקים ומצב שגיאה — בדיקת RTL, ציר משמאל לימין, טקסט שלא נחתך, ושהניווט לא מכסה את הסיכום בסוף הגלילה.

### הרצה
`npm run check` (TypeScript, Vitest, Build, Playwright) חייב לעבור. הבדיקות הקיימות של M1–M3 ממשיכות לעבור (בדיקת ה־`%` הישנה ב־`LearnScreen.test.tsx` מוחלפת כמפורט).

## 6. תיעוד

- ADR ב־ARCHITECTURE.md: ההתקדמות נגזרת בכל טעינה מ־`listResults` (ללא Cache או מצב מצטבר), מתרעננת רק אחרי `saved`; ימי התרגול במרווחים שווים; אין שינוי Schema.
- סימון 🟡 ליד M4 ב־MILESTONES.md בסיום הבנייה.

## החלטות קטנות שנבחרו (לא מוגדרות ב־spec) — לאישורך

- **היום לא תורגל אבל יש היסטוריה:** הגרף מוצג, והסיכום כותב „היום: עדיין לא נבדקו תרגילים” בלי שורת אחוזים.
- **יחיד:** „היום: תרגיל 1 נבדק” / „1 נכון בניסיון הראשון · 100%”.
- **כשל בטעינת ההתקדמות:** „לא ניתן לטעון את ההתקדמות” (ה־spec מגדיר נוסח רק לכשל שמירה).
- **ריווח ציר הזמן:** מרווחים שווים בין ימי התרגול (עודכן ב־ARCHITECTURE לבקשתך, ADR-8).
- **אחוזים:** עיגול לשלם הקרוב לתצוגה בלבד.

## Definition of Done — איך כל תנאי ייבדק

| תנאי | בדיקה |
| --- | --- |
| 10 תרגילים, 8 נכונים ← 10, 8, 80% | `progress.test.ts`, e2e 1 |
| טעות שתוקנה לא הופכת להצלחה; נטישה אחרי טעות במכנה | `progress.test.ts`, e2e 2 |
| ניסיונות חוזרים לא מגדילים ספירה; הגרלה חדשה עם אותם גורמים נספרת בנפרד | `progress.test.ts`, e2e 2 |
| יום ללא תרגול אינו 0%; מכנה אפס בלי חלוקה באפס | `progress.test.ts`, `ProgressSection.test.tsx`, e2e 3 |
| נתון יחיד בלי טענת מגמה | `ProgressChart.test.tsx`, e2e 4 |
| יותר מ־7 ימים ← 7 האחרונים; הישנים שמורים | `progress.test.ts`, `ProgressChart.test.tsx`, e2e 3 |
| חצות, תאריך מקומי ואזור זמן שומרים על השיוך | `progress.test.ts`, e2e 5 |
| הפרדת פרופילים; אותה התקדמות אחרי סגירה ופתיחה | Repository test, e2e 6 |
| נתוני Mockup לא קבועים; שגיאת שמירה לא נכנסת לגרף | `LearnScreen.test.tsx`, e2e 7–8 |
| קריא במובייל ולא מוסתר בניווט; בדיקות חישוב ודפדפן עוברות | צילומי מסך + `npm run check` |
| Migration | אין שינוי Schema — מדווח שאין Migration נדרש |
| הצגה למשתמש ועצירה לאישור | סיכום בסוף הבנייה |
