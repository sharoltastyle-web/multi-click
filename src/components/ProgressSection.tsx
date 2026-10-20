import type { ProgressStatus } from '../app/useProgress';
import { formatPercent, todaySummary, type DailyProgress } from '../domain/progress';
import { ProgressChart } from './ProgressChart';
import styles from './ProgressSection.module.css';

export const NO_RESULTS_MESSAGE = 'עדיין אין תוצאות. אפשר להתחיל לתרגל!';
export const PROGRESS_LOAD_ERROR_MESSAGE = 'לא ניתן לטעון את ההתקדמות';

function checkedLine(count: number) {
  if (count === 0) return 'היום: עדיין לא נבדקו תרגילים';
  if (count === 1) return 'היום: תרגיל 1 נבדק';
  return `היום: ${count} תרגילים נבדקו`;
}

function correctLine(count: number) {
  return count === 1 ? '1 נכון בניסיון הראשון' : `${count} נכונים בניסיון הראשון`;
}

/** Chart and daily summary of the active profile, below the "my progress" heading. */
export function ProgressSection({
  status,
  days,
  todayKey,
}: {
  status: ProgressStatus;
  days: readonly DailyProgress[];
  todayKey: string;
}) {
  if (status === 'loading') return <div className={styles.placeholder} />;
  if (status === 'error') {
    return (
      <p role="alert" className={styles.message}>
        {PROGRESS_LOAD_ERROR_MESSAGE}
      </p>
    );
  }
  if (days.length === 0) return <p className={styles.message}>{NO_RESULTS_MESSAGE}</p>;

  const today = todaySummary(days, todayKey);
  return (
    <div className={styles.progress}>
      <ProgressChart days={days} />
      <div className={styles.summary} aria-live="polite">
        <p>{checkedLine(today.checkedCount)}</p>
        {today.accuracy !== undefined && (
          <p>
            {correctLine(today.firstCorrectCount)} · <bdi>{formatPercent(today.accuracy)}</bdi>
          </p>
        )}
      </div>
    </div>
  );
}
