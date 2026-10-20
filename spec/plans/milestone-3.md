# תוכנית — Milestone 3: תרגול מקצה לקצה ושמירת תוצאות

מבוסס על PRD.md (F2, F3, F4, Edge Cases), ARCHITECTURE.md (סעיפים 3, 4, 5, 7), DESIGN.md (מסך הלימוד, Style Guide) והקוד הקיים אחרי M2.

## מטרה

במסך הלימוד הילד בוחר סוג תרגול, פותר תרגיל אחד בכל פעם, מקבל משוב ורמז, וממשיך ידנית אחרי הצלחה. כל בדיקה תקינה נשמרת ב־IndexedDB כרשומת `ExerciseResult` של הפרופיל הפעיל, בלי כפילויות ובלי שיוך שגוי. אזור „ההתקדמות שלי” נשאר כותרת בלבד (הגרף והסיכום ב־M4).

## מצב קיים רלוונטי

- `LearnScreen.tsx` מציג כותרת, כינוי ואווטאר, קו הפרדה וכותרת „ההתקדמות שלי”.
- `MathExpression` כבר מציג `a × b = ?` כמקטע LTR מבודד.
- `TextField`, `Button` (primary / secondary) ו־Design Tokens קיימים.
- `db.ts`: Schema גרסה 1 עם טבלת `profiles` בלבד. `profileRepository` מחזיר `Result<T>`.
- הפרופיל הפעיל בזיכרון ב־`ActiveProfileContext`; מעבר פרופיל נעשה רק דרך מסך הבית.

## 1. Practice Domain — `src/domain/practice.ts` (+ `practice.test.ts`)

פונקציות TypeScript טהורות, ללא React, DOM או Dexie. האקראיות מוזרקת (`random: () => number`, ברירת מחדל `Math.random`) כדי שהבדיקות יהיו דטרמיניסטיות.

- קבועים: `FACTOR_MIN = 1`, `FACTOR_MAX = 10`, `ANSWER_MIN = 1`, `ANSWER_MAX = 100`.
- `type PracticeMode = 'random' | 'selectedFactor'`.
- `interface Exercise { id: string; factorA: number; factorB: number; mode: PracticeMode; selectedFactor?: number }`.
- `createExercise(mode, selectedFactor, random?)`: `id` חדש ב־`crypto.randomUUID()`.
  - random: שני הגורמים אקראיים 1–10.
  - selectedFactor: `factorA = selectedFactor`, `factorB` אקראי 1–10 (כמו ב־Mockup: כפולה 3 ← `3 × 4`).
- `validateAnswer(text)`: אחרי trim, רק ספרות (`^\d{1,3}$`) ובטווח 1–100. אחרת `{ ok: false }`. כך „12abc”, „5.5”, „-3”, ריק ו־„0” נדחים.
- `isCorrectAnswer(exercise, answer)`: השוואה ל־`factorA × factorB`.
- `buildHint(exercise)`: מחזיר את הטקסט „אפשר לחשב …” עם חיבור חוזר שלא חושף את התוצאה:
  - אם `factorA === 1`: חוזרים על 1, `factorB` פעמים (1 × 7 ← „1 + 1 + 1 + 1 + 1 + 1 + 1”).
  - אחרת: חוזרים על `factorB`, `factorA` פעמים (3 × 4 ← „4 + 4 + 4”; 7 × 1 ← שבעה אחדים).
  - 1 × 1 ← „אפשר לחשב 1”.
  - הביטוי עצמו מוצג כמקטע LTR מבודד (`<bdi dir="ltr">`).
- טקסטים (קבועים מיוצאים): `SUCCESS_MESSAGE = 'כל הכבוד! תשובה נכונה'`, `RETRY_MESSAGE = 'עוד ניסיון, אפשר להצליח!'`, `INVALID_ANSWER_MESSAGE = 'יש להקליד מספר שלם בין 1 ל־100'`, `RESULTS_NOT_SAVED_MESSAGE = 'התוצאות לא נשמרו במכשיר'`.

בדיקות: כל הגורמים תמיד 1–10 (כולל קצוות של `random` = 0 ו־0.9999), כפולה נבחרת מקבעת את `factorA`, Validation לכל סוגי הקלט הלא תקין ולגבולות 1 ו־100, רמז לכל 100 התרגילים — אף רמז אינו מכיל את התוצאה כמספר בודד (למעט 1 × 1 שבו הרמז „1” הוא גם התוצאה, כפי שה־PRD מגדיר) וסכום הרמז שווה למכפלה.

## 2. Results Domain — `src/domain/exerciseResult.ts` (+ `exerciseResult.test.ts`)

- `interface ExerciseResult` לפי ARCHITECTURE.md: `id` (= מזהה התרגיל), `profileId`, `factorA`, `factorB`, `mode`, `selectedFactor?`, `firstCheckedAt`, `firstCheckLocalDate`, `firstAttemptCorrect`, `attemptCount`, `solved`, `solvedAt?`, `lastSubmittedAnswer`, `lastSubmissionKey`, `revision`.
- `toLocalDateKey(date)`: `YYYY-MM-DD` מרכיבי תאריך מקומיים (`getFullYear/getMonth/getDate`), ללא `toISOString`.
- `interface AttemptCommand { profileId; exercise; answer; correct; submissionKey; checkedAt; expectedRevision }` — כל הערכים נלכדים ברגע הלחיצה.
- `decideAttempt(existing | undefined, command)` — פונקציה טהורה שמחזירה אחת מ:
  - `create` — אין רשומה: `attemptCount = 1`, `firstAttemptCorrect = correct`, `firstCheckedAt = checkedAt`, `firstCheckLocalDate = toLocalDateKey(checkedAt)`, `solved = correct`, `revision = 1`.
  - `duplicate` — `lastSubmissionKey` זהה (Retry של אותה כתיבה), או אותו ערך כמו `lastSubmittedAnswer` (ללא ערך אחר בינתיים).
  - `alreadySolved` — הרשומה כבר `solved`.
  - `conflict` — `revision` שונה מהצפוי; אין הגדלת מונה.
  - `update` — `attemptCount + 1`, מעדכנים `lastSubmittedAnswer`, `lastSubmissionKey`, `revision + 1`, ובהצלחה `solved = true`, `solvedAt`. **`firstAttemptCorrect`, `firstCheckedAt` ו־`firstCheckLocalDate` אינם משתנים לעולם.**

בדיקות: טעות ואז הצלחה ← `firstAttemptCorrect=false`, `attemptCount=2`, `solved=true`; אותו ערך פעמיים ← duplicate; אותו submissionKey ← duplicate; אחרי פתרון ← alreadySolved; revision ישן ← conflict; בדיקה ראשונה ב־23:59 ותיקון ב־00:01 (`vi.setSystemTime`) ← התאריך המקורי נשמר; `toLocalDateKey` אינו משתמש ב־UTC (בדיקה סמוך לחצות).

## 3. Persistence

### `src/persistence/db.ts` — Schema גרסה 2 (Additive)

```ts
db.version(1).stores({ profiles: 'id' });               // unchanged
db.version(2).stores({
  profiles: 'id',
  exerciseResults: 'id, profileId, [profileId+firstCheckLocalDate]',
});
```

אין `upgrade()` — אין המרת נתונים, רק טבלה חדשה. גרסה 1 לא נערכת. מוסיפים `exerciseResults: EntityTable<ExerciseResult, 'id'>` ל־`AppDb`.

### `src/persistence/exerciseResultRepository.ts` (+ test)

- `submitAttempt(command): Promise<AttemptOutcome>` כאשר `AttemptOutcome` הוא `{ status: 'saved' | 'duplicate' | 'alreadySolved' | 'conflict'; record } | { status: 'error' }`.
- Transaction קצר `rw` על `profiles` ו־`exerciseResults`: בודק שהפרופיל קיים (אחרת error), קורא את הרשומה לפי `exercise.id`, מפעיל `decideAttempt`, וכותב רק ב־create/update. אין המתנה ל־UI או לרשת בתוך ה־Transaction.
- `listResults(profileId)` — לשימוש בבדיקות עכשיו וב־M4.
- כל חריגה (כולל `QuotaExceededError`) ← `{ status: 'error' }` ו־`console.error`, בלי למחוק נתונים.

בדיקות (fake-indexeddb): יצירה ועדכון, Retry עם אותו submissionKey אינו מכפיל, שתי קריאות מקבילות עם אותו `expectedRevision` ← אחת נשמרת ואחת conflict, פרופיל שלא קיים ← error, DB שזורק ← error ושום רשומה לא נוצרה, תוצאות של פרופיל אחד לא מופיעות ב־`listResults` של אחר.

### בדיקת Migration — `db.test.ts`

- DB ריק ← `verno === 2`, שתי טבלאות והאינדקסים.
- יצירת DB בגרסה 1 בלבד (Dexie נפרד עם `version(1)` בלבד) עם שני פרופילים ← סגירה ← פתיחה דרך `createDb` ← אותם פרופילים בדיוק, `verno === 2`, `exerciseResults` ריקה.

## 4. מצב התרגיל — `src/app/practiceReducer.ts` (+ test) ו־`src/app/usePractice.ts`

לפי ARCHITECTURE.md: `useReducer` בזיכרון, מצבים `awaitingAnswer`, `saving`, `incorrect`, `correct`.

State: `mode`, `selectedFactor`, `exercise`, `answerText`, `phase`, `validationError`, `lastCheckedAnswer`, `revision` (הידוע לנו מהשמירה האחרונה), `notSaved` (כשל שמירה בתרגיל הנוכחי).

Actions: `answerChanged`, `invalidAnswer`, `checkStarted`, `checkFinished`, `modeChanged`, `factorChanged`, `nextExercise(exerciseId)`.

כללים:
- `modeChanged` / `factorChanged` ← תרגיל חדש, שדה ריק, ניקוי משוב. לא זמינים בזמן `saving`.
- `nextExercise` מתקבל רק אם `phase === 'correct'` וה־exerciseId תואם לתרגיל הנוכחי — לחיצה כפולה מהירה לא מדלגת על תרגיל.
- בזמן `correct` הבדיקה נעולה (לא נרשמות בדיקות נוספות לאותו מופע).
- בדיקה חוזרת של אותו ערך כמו `lastCheckedAnswer` במצב `incorrect` ← לא נוצרת כתיבה; המשוב פשוט נשאר.

`usePractice(profileId)`:
1. Validation ← קלט לא תקין מציג את ההודעה, ללא כתיבה וללא שינוי התרגיל.
2. Guard סינכרוני ב־`useRef` (busy) לפני ה־Render הבא ← לחיצות מהירות על „בדיקה” יוצרות כתיבה אחת.
3. לכידת `profileId`, התרגיל, התשובה, `submissionKey = crypto.randomUUID()`, `checkedAt = Date.now()` ו־`expectedRevision`.
4. הנכונות והרמז מחושבים מה־Domain, והכתיבה דרך ה־Repository.
5. תוצאה:
   - `saved` / `duplicate` / `alreadySolved` ← עדכון `revision` מהרשומה, משוב רגיל.
   - `conflict` ← מאמצים את הרשומה השמורה (revision ומצב פתרון) בלי להגדיל מונה.
   - `error` ← המשוב (נכון/שגוי + רמז) מוצג בזיכרון, ובנפרד ההודעה „התוצאות לא נשמרו במכשיר”. התרגיל מסומן `notSaved`: בדיקות נוספות שלו נשארות בזיכרון בלבד (כדי לא ליצור רשומה שבה ניסיון מאוחר נרשם בטעות כ„ניסיון ראשון”). התרגיל הבא מנסה לשמור כרגיל.
6. מסך הלימוד מקבל `key={activeProfile.id}` — החלפת פרופיל זורקת את מצב התרגיל. כתיבה שכבר יצאה לדרך נושאת את ה־profileId שנלכד, ולכן לא תשויך לפרופיל החדש; תשובה שמגיעה אחרי Unmount מתעלמת מה־UI.

בדיקות reducer: כל המעברים לעיל, כולל nextExercise עם id ישן, שינוי מצב בזמן saving, ובחירת כפולה יוצרת תרגיל עם הגורם הנכון.

## 5. ממשק — מסך הלימוד

סדר הרכיבים לפי DESIGN.md וה־Mockup, מלמעלה למטה:

1. `ScreenHeader` עם הכינוי והאווטאר (קיים).
2. **בחירת סוג תרגול** — `fieldset` עם `legend` מוסתר חזותית „סוג תרגול”: Radio „תרגול אקראי” (מימין, ברירת מחדל) ו־Radio „תרגול לפי כפולה” (משמאל), ומתחתיו התווית „כפולה” ו־`select` מקורי 1–10, קומפקטי, אפור ו־`disabled` במצב אקראי. Radio עגול עם מסגרת Navy, נבחר = מילוי Cyan ומרכז כהה. Touch target ≥ 48px.
3. **התרגיל** — `MathExpression` גדול וממורכז.
4. **שדה תשובה** — `TextField` בתווית „התשובה שלך”, `inputMode="numeric"`, `autoComplete="off"`, `enterKeyHint="done"`. הכול בתוך `<form>` כך ש־Enter מפעיל בדיקה. במצב `correct` השדה `readOnly`.
5. **„בדיקה”** — כפתור Coral רחב (`type="submit"`), `disabled` במצב `saving` ו־`correct`.
6. **אזור משוב** (`aria-live="polite"`), מוצג רק כשיש מה להציג:
   - הודעת Validation מתחת לשדה (קשורה ב־`aria-describedby`).
   - הצלחה: פס Lime עם אייקון ✓ ו„כל הכבוד! תשובה נכונה”, ומתחתיו כפתור Cyan רחב „לתרגיל הבא”.
   - טעות: פס צהוב בהיר (גוון של Sunshine ב־`color-mix`) עם אייקון ! ו„עוד ניסיון, אפשר להצליח!”, ומתחתיו הרמז.
   - כשל שמירה: הודעה נפרדת (`role="alert"`) „התוצאות לא נשמרו במכשיר”.
   - המשוב אינו מסתמך על צבע בלבד: יש טקסט ואייקון.
7. קו הפרדה וכותרת „ההתקדמות שלי” (ללא נתונים — M4).

Focus: אחרי „לתרגיל הבא” ושינוי מצב — Focus לשדה התשובה. אחרי טעות — השדה נשאר זמין לעריכה.

### קבצים חדשים / משתנים

| קובץ | תוכן |
| --- | --- |
| `src/components/PracticeModePicker.tsx` + `.module.css` | Radio ו־Select |
| `src/components/FeedbackMessage.tsx` + `.module.css` | פס הצלחה / ניסיון נוסף עם אייקון SVG פנימי |
| `src/components/PracticePanel.tsx` + `.module.css` | חיבור `usePractice` לתרגיל, לשדה, לכפתורים ולמשוב |
| `src/components/TextField.tsx` | העברת `aria-describedby` / הודעת שגיאה (אם נדרש) — ללא שינוי בהתנהגות הקיימת |
| `src/styles/tokens.css` | גוונים נגזרים בלבד: `--color-lime-light`, `--color-sunshine-light` ב־`color-mix` (אין HEX חדש) |
| `src/screens/LearnScreen.tsx` | הוספת `<PracticePanel key={activeProfile.id} profileId=… />` בין הכותרת לקו ההפרדה; עדכון ההערה |

## 6. בדיקות

### Vitest
- `practice.test.ts`, `exerciseResult.test.ts`, `practiceReducer.test.ts`, `exerciseResultRepository.test.ts`, `db.test.ts` (Migration) — כמפורט למעלה.
- `LearnScreen.test.tsx` / `PracticePanel.test.tsx` (Testing Library + fake-indexeddb, `Math.random` מדומה): Select מושבת במצב אקראי ופעיל במצב כפולה; קלט לא תקין מציג את ההודעה ואינו יוצר רשומה; טעות מציגה עידוד ורמז ואותו תרגיל; הצלחה מציגה הודעה ו„לתרגיל הבא”, ורק הלחיצה עליו מחליפה תרגיל; Repository שנכשל ← „התוצאות לא נשמרו במכשיר” ואין רשומה; עדיין אין `%` במסך.

### Playwright — `e2e/practice.spec.ts` (על Production Build, Chromium + WebKit)
התשובה הנכונה מחושבת מהגורמים שמוצגים במסך; את הרשומות קוראים מ־IndexedDB ב־`page.evaluate`.
1. טעות ואז הצלחה ← הודעות נכונות, רמז, „לתרגיל הבא” ידני; ברשומה `firstAttemptCorrect=false`, `attemptCount=2`, `solved=true`.
2. קלט ריק / „0” / „101” / „12abc” ← הודעת Validation, אין רשומה.
3. לחיצה כפולה מהירה על „בדיקה” ועל „לתרגיל הבא”, ובדיקה חוזרת של אותו ערך שגוי ← אין ספירה כפולה ואין דילוג.
4. תרגיל שנבדק בטעות ונעזב (מעבר לאודות) ← הרשומה נשארת; תרגיל שלא נבדק ← אין רשומה.
5. מצב כפולה: בחירת 7 ← כל התרגילים מתחילים ב־7; החלפת מצב יוצרת תרגיל חדש ואינה מוחקת רשומות.
6. שני פרופילים: תרגול בכל אחד ← הרשומות משויכות ל־profileId הנכון ואינן עוברות; Refresh ← הרשומות קיימות והתרגיל הפתוח לא משוחזר.
7. כשל כתיבה מדומה (החלפת `IDBObjectStore.prototype.put/add` כך שיזרקו, אחרי יצירת הפרופיל) ← משוב בזיכרון + „התוצאות לא נשמרו במכשיר”, ואין רשומה.
8. Migration בדפדפן: `addInitScript` שיוצר את `kefel-bekef-db` בגרסה הנייטיבית של Schema 1 (Dexie version 1 = IDB version 10) עם פרופיל ← האפליקציה מציגה את הפרופיל, מתרגלים, והרשומה נשמרת.

### חזותי
צילומי מסך במובייל (Pixel 7, iPhone 13) של: מצב רגיל (מול ה־Mockup), מצב כפולה, טעות + רמז, הצלחה, הודעת Validation — בדיקת RTL, סדר `3 × 4 = ?`, שהטקסט לא נחתך ושהניווט לא מכסה את „לתרגיל הבא”.

### הרצה
`npm run check` (TypeScript, Vitest, Build, Playwright) חייב לעבור.

## 7. תיעוד

- ADR ב־ARCHITECTURE.md: מדיניות כשל שמירה — תרגיל שהשמירה שלו נכשלה ממשיך בזיכרון בלבד, ו־Retry באותו submissionKey נתמך ברמת ה־Repository.
- ADR: Schema גרסה 2 (Additive, ללא upgrade) והכפולה הקבועה היא הגורם הראשון בתרגיל.
- סימון 🟡 ליד M3 ב־MILESTONES.md בסיום הבנייה.

## החלטות קטנות שנבחרו (לא מוגדרות ב־spec)

- ערך ברירת המחדל של ה־Select: **1** (ה־3 שב־Mockup הוא דוגמה).
- בתרגול לפי כפולה, הכפולה שנבחרה היא **הגורם הראשון** (כמו `3 × 4` ב־Mockup), כך שהרמז הוא חיבור חוזר של הגורם השני.
- אחרי הצלחה, „בדיקה” נשאר במקומו אך לא פעיל, ו„לתרגיל הבא” מופיע מתחת להודעת ההצלחה.

## Definition of Done — איך כל תנאי ייבדק

| תנאי | בדיקה |
| --- | --- |
| רק גורמים 1–10; כפולה מקבעת גורם | `practice.test.ts`, e2e 5 |
| טעות ← אותו תרגיל ורמז נכון ללא חשיפה, כולל גורם 1; הצלחה ← הודעת PRD והמשך ידני | `practice.test.ts`, PracticePanel test, e2e 1 |
| קלט ריק / מחוץ לטווח / לא תקין אינו ניסיון | `practice.test.ts`, e2e 2 |
| טעות ואז הצלחה ← false, מונה, solved | `exerciseResult.test.ts`, e2e 1 |
| אותו ערך, לחיצות מהירות, Retry ← בלי כפילות | Domain + Repository tests, e2e 3 |
| ננטש אחרי בדיקה ← שמור; לא נבדק ← אין רשומה | e2e 4 |
| תאריך הבדיקה הראשונה לא משתנה אחרי חצות; Refresh שומר | `exerciseResult.test.ts`, e2e 6 |
| החלפת פרופיל / כתיבה אסינכרונית / התנגשות | Repository tests (מקביליות, conflict), e2e 6 |
| כשל כתיבה מדומה אינו נשמר כהצלחה | Repository test, PracticePanel test, e2e 7 |
| Migration מ־Schema של M2 שומר פרופילים | `db.test.ts`, e2e 8 |
| בדיקות Domain ודפדפן עוברות; בדיקה חזותית בעברית | `npm run check` + צילומי מסך |
