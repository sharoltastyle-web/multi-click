import type { ExerciseResult } from './exerciseResult';

/** First-attempt accuracy of one practice day, derived from stored results. */
export interface DailyProgress {
  /** YYYY-MM-DD local date of the first check (firstCheckLocalDate). */
  date: string;
  checkedCount: number;
  firstCorrectCount: number;
  /** Exact percentage 0–100; days only exist when checkedCount > 0. */
  accuracy: number;
}

export interface TodaySummary {
  checkedCount: number;
  firstCorrectCount: number;
  /** Missing when nothing was checked today (no division by zero). */
  accuracy?: number;
}

export const MAX_CHART_DAYS = 7;

/** Groups results by their stored local first-check date, oldest day first. */
export function aggregateDaily(results: readonly ExerciseResult[]): DailyProgress[] {
  const byDate = new Map<string, { checked: number; firstCorrect: number }>();
  for (const result of results) {
    const day = byDate.get(result.firstCheckLocalDate) ?? { checked: 0, firstCorrect: 0 };
    day.checked += 1;
    if (result.firstAttemptCorrect) day.firstCorrect += 1;
    byDate.set(result.firstCheckLocalDate, day);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, { checked, firstCorrect }]) => ({
      date,
      checkedCount: checked,
      firstCorrectCount: firstCorrect,
      accuracy: (100 * firstCorrect) / checked,
    }));
}

/** The latest practice days (not calendar days); older days stay stored. */
export function lastPracticeDays(
  days: readonly DailyProgress[],
  max = MAX_CHART_DAYS,
): DailyProgress[] {
  return days.slice(-max);
}

export function todaySummary(days: readonly DailyProgress[], todayKey: string): TodaySummary {
  const today = days.find((day) => day.date === todayKey);
  if (!today) return { checkedCount: 0, firstCorrectCount: 0 };
  return {
    checkedCount: today.checkedCount,
    firstCorrectCount: today.firstCorrectCount,
    accuracy: today.accuracy,
  };
}

/** Rounds for display only; the stored calculation stays exact. */
export function formatPercent(accuracy: number): string {
  return `${Math.round(accuracy)}%`;
}

function parseDateKey(key: string): [number, number, number] {
  const [y = 0, m = 1, d = 1] = key.split('-').map(Number);
  return [y, m, d];
}

/** '2026-10-17' → '17.10', without going through Date or UTC. */
export function formatShortDate(key: string): string {
  const [, m, d] = parseDateKey(key);
  return `${d}.${m}`;
}
