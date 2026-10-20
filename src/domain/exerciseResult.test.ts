import { afterEach, describe, expect, it, vi } from 'vitest';
import { decideAttempt, toLocalDateKey, type AttemptCommand, type ExerciseResult } from './exerciseResult';
import type { Exercise } from './practice';

const exercise: Exercise = { id: 'e1', factorA: 3, factorB: 4, mode: 'selectedFactor', selectedFactor: 3 };

function command(overrides: Partial<AttemptCommand> = {}): AttemptCommand {
  return {
    profileId: 'p1',
    exercise,
    answer: 7,
    correct: false,
    submissionKey: crypto.randomUUID(),
    checkedAt: new Date(2026, 9, 20, 10, 0).getTime(),
    expectedRevision: 0,
    ...overrides,
  };
}

function apply(existing: ExerciseResult | undefined, cmd: AttemptCommand): ExerciseResult {
  const decision = decideAttempt(existing, cmd);
  if (decision.kind !== 'create' && decision.kind !== 'update') throw new Error(decision.kind);
  return decision.next;
}

afterEach(() => vi.useRealTimers());

describe('toLocalDateKey', () => {
  it('uses local date parts, not UTC', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
    expect(toLocalDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('decideAttempt', () => {
  it('creates a record on the first valid check', () => {
    const first = apply(undefined, command());
    expect(first).toMatchObject({
      id: 'e1',
      profileId: 'p1',
      factorA: 3,
      factorB: 4,
      mode: 'selectedFactor',
      selectedFactor: 3,
      firstCheckLocalDate: '2026-10-20',
      firstAttemptCorrect: false,
      attemptCount: 1,
      solved: false,
      lastSubmittedAnswer: 7,
      revision: 1,
    });
    expect(first.solvedAt).toBeUndefined();
  });

  it('records a correct first attempt as solved', () => {
    const first = apply(undefined, command({ answer: 12, correct: true }));
    expect(first).toMatchObject({ firstAttemptCorrect: true, solved: true, attemptCount: 1 });
    expect(first.solvedAt).toBe(first.firstCheckedAt);
  });

  it('wrong then right keeps firstAttemptCorrect=false and counts both attempts', () => {
    const first = apply(undefined, command());
    const second = apply(first, command({ answer: 12, correct: true, expectedRevision: 1 }));
    expect(second).toMatchObject({
      firstAttemptCorrect: false,
      attemptCount: 2,
      solved: true,
      revision: 2,
      lastSubmittedAnswer: 12,
    });
  });

  it('does not count the same value twice in a row', () => {
    const first = apply(undefined, command());
    expect(decideAttempt(first, command({ expectedRevision: 1 })).kind).toBe('duplicate');
  });

  it('counts a value again after a different value was checked in between', () => {
    const r1 = apply(undefined, command({ answer: 7 }));
    const r2 = apply(r1, command({ answer: 8, expectedRevision: 1 }));
    const r3 = apply(r2, command({ answer: 7, expectedRevision: 2 }));
    expect(r3.attemptCount).toBe(3);
  });

  it('treats a retry with the same submission key as a duplicate', () => {
    const cmd = command();
    const first = apply(undefined, cmd);
    expect(decideAttempt(first, cmd).kind).toBe('duplicate');
  });

  it('records nothing more after the exercise was solved', () => {
    const solved = apply(undefined, command({ answer: 12, correct: true }));
    expect(decideAttempt(solved, command({ answer: 13, expectedRevision: 1 })).kind).toBe(
      'alreadySolved',
    );
  });

  it('reports a conflict instead of counting on a stale revision', () => {
    const r1 = apply(undefined, command({ answer: 7 }));
    const r2 = apply(r1, command({ answer: 8, expectedRevision: 1 }));
    expect(decideAttempt(r2, command({ answer: 9, expectedRevision: 1 })).kind).toBe('conflict');
  });

  it('never moves a result to another profile', () => {
    const r1 = apply(undefined, command());
    expect(decideAttempt(r1, command({ profileId: 'p2', answer: 8, expectedRevision: 1 })).kind).toBe(
      'conflict',
    );
  });

  it('keeps the first-check date when the correction happens after midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 23, 59));
    const first = apply(undefined, command({ checkedAt: Date.now() }));
    vi.setSystemTime(new Date(2026, 9, 21, 0, 1));
    const second = apply(
      first,
      command({ answer: 12, correct: true, checkedAt: Date.now(), expectedRevision: 1 }),
    );
    expect(second.firstCheckLocalDate).toBe('2026-10-20');
    expect(second.firstCheckedAt).toBe(first.firstCheckedAt);
    expect(second.solvedAt).toBe(new Date(2026, 9, 21, 0, 1).getTime());
  });
});
