import { describe, expect, it } from 'vitest';
import type { ExerciseResult } from './exerciseResult';
import {
  aggregateDaily,
  formatPercent,
  formatShortDate,
  lastPracticeDays,
  todaySummary,
} from './progress';

let next = 0;
function result(overrides: Partial<ExerciseResult> = {}): ExerciseResult {
  next += 1;
  return {
    id: `e${next}`,
    profileId: 'p1',
    factorA: 3,
    factorB: 4,
    mode: 'random',
    firstCheckedAt: new Date(2026, 9, 19, 12).getTime(),
    firstCheckLocalDate: '2026-10-19',
    firstAttemptCorrect: true,
    attemptCount: 1,
    solved: true,
    lastSubmittedAnswer: 12,
    lastSubmissionKey: `k${next}`,
    revision: 1,
    ...overrides,
  };
}

describe('aggregateDaily', () => {
  it('counts 10 checked with 8 correct on the first attempt as 80%', () => {
    const results = [
      ...Array.from({ length: 8 }, () => result()),
      ...Array.from({ length: 2 }, () => result({ firstAttemptCorrect: false })),
    ];
    expect(aggregateDaily(results)).toEqual([
      { date: '2026-10-19', checkedCount: 10, firstCorrectCount: 8, accuracy: 80 },
    ]);
  });

  it('keeps a corrected mistake as a first-attempt miss and counts abandoned exercises', () => {
    const corrected = result({ firstAttemptCorrect: false, solved: true, attemptCount: 3 });
    const abandoned = result({ firstAttemptCorrect: false, solved: false, attemptCount: 1 });
    const [day] = aggregateDaily([result(), corrected, abandoned]);
    expect(day!).toMatchObject({ checkedCount: 3, firstCorrectCount: 1 });
    expect(day!.accuracy).toBeCloseTo(100 / 3);
  });

  it('counts a new draw of the same factors as a separate exercise', () => {
    const [day] = aggregateDaily([result({ id: 'a' }), result({ id: 'b' })]);
    expect(day!.checkedCount).toBe(2);
  });

  it('creates no zero day for a day without practice and sorts chronologically', () => {
    const days = aggregateDaily([
      result({ firstCheckLocalDate: '2026-10-19' }),
      result({ firstCheckLocalDate: '2026-10-17', firstAttemptCorrect: false }),
    ]);
    expect(days.map((d) => [d.date, d.accuracy])).toEqual([
      ['2026-10-17', 0],
      ['2026-10-19', 100],
    ]);
  });

  it('groups by the stored local date only, not by the timestamp', () => {
    // Checked at 23:59 local time and corrected after midnight: still the first day.
    const lateNight = result({
      firstCheckedAt: new Date(2026, 9, 18, 23, 59).getTime(),
      firstCheckLocalDate: '2026-10-18',
      solvedAt: new Date(2026, 9, 19, 0, 5).getTime(),
    });
    // A timestamp that falls on another UTC day keeps its stored local date.
    const otherZone = result({
      firstCheckedAt: Date.UTC(2026, 9, 17, 22, 30),
      firstCheckLocalDate: '2026-10-18',
    });
    expect(aggregateDaily([lateNight, otherZone]).map((d) => d.date)).toEqual(['2026-10-18']);
  });
});

describe('lastPracticeDays', () => {
  it('keeps only the latest 7 practice days without changing the input', () => {
    const days = aggregateDaily(
      Array.from({ length: 9 }, (_, i) =>
        result({ firstCheckLocalDate: `2026-10-${String(i * 2 + 1).padStart(2, '0')}` }),
      ),
    );
    const shown = lastPracticeDays(days);
    expect(shown).toHaveLength(7);
    expect(shown[0]!.date).toBe('2026-10-05');
    expect(shown[6]!.date).toBe('2026-10-17');
    expect(days).toHaveLength(9);
  });
});

describe('todaySummary', () => {
  it('returns today counts and accuracy', () => {
    const days = aggregateDaily([result(), result({ firstAttemptCorrect: false })]);
    expect(todaySummary(days, '2026-10-19')).toEqual({
      checkedCount: 2,
      firstCorrectCount: 1,
      accuracy: 50,
    });
  });

  it('has no accuracy for a day without checked exercises', () => {
    const days = aggregateDaily([result()]);
    expect(todaySummary(days, '2026-10-20')).toEqual({ checkedCount: 0, firstCorrectCount: 0 });
  });
});

describe('formatting', () => {
  it('formats short dates and rounded percentages', () => {
    expect(formatShortDate('2026-10-17')).toBe('17.10');
    expect(formatShortDate('2026-01-05')).toBe('5.1');
    expect(formatPercent(200 / 3)).toBe('67%');
    expect(formatPercent(80)).toBe('80%');
  });
});
