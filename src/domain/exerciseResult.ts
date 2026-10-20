import type { Exercise, PracticeMode } from './practice';

/** One checked exercise instance of a profile, as stored in IndexedDB. */
export interface ExerciseResult {
  /** Equals the exercise instance id. */
  id: string;
  profileId: string;
  factorA: number;
  factorB: number;
  mode: PracticeMode;
  selectedFactor?: number;
  firstCheckedAt: number;
  /** YYYY-MM-DD in the device's local calendar at the first check; never rewritten. */
  firstCheckLocalDate: string;
  firstAttemptCorrect: boolean;
  attemptCount: number;
  solved: boolean;
  solvedAt?: number;
  lastSubmittedAnswer: number;
  lastSubmissionKey: string;
  revision: number;
}

/** Everything captured at the moment the child pressed "check". */
export interface AttemptCommand {
  profileId: string;
  exercise: Exercise;
  answer: number;
  correct: boolean;
  submissionKey: string;
  checkedAt: number;
  /** Revision the UI last saw for this exercise; 0 when nothing was saved yet. */
  expectedRevision: number;
}

export type AttemptDecision =
  | { kind: 'create'; next: ExerciseResult }
  | { kind: 'update'; next: ExerciseResult }
  | { kind: 'duplicate' | 'alreadySolved' | 'conflict'; current: ExerciseResult };

/** Local calendar date key built from local date parts (not from an ISO/UTC string). */
export function toLocalDateKey(time: number | Date): string {
  const date = new Date(time);
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Decides how a checked attempt changes the stored result, without touching storage. */
export function decideAttempt(
  existing: ExerciseResult | undefined,
  command: AttemptCommand,
): AttemptDecision {
  const { exercise, answer, correct, submissionKey, checkedAt } = command;

  if (!existing) {
    const next: ExerciseResult = {
      id: exercise.id,
      profileId: command.profileId,
      factorA: exercise.factorA,
      factorB: exercise.factorB,
      mode: exercise.mode,
      firstCheckedAt: checkedAt,
      firstCheckLocalDate: toLocalDateKey(checkedAt),
      firstAttemptCorrect: correct,
      attemptCount: 1,
      solved: correct,
      lastSubmittedAnswer: answer,
      lastSubmissionKey: submissionKey,
      revision: 1,
    };
    if (exercise.selectedFactor !== undefined) next.selectedFactor = exercise.selectedFactor;
    if (correct) next.solvedAt = checkedAt;
    return { kind: 'create', next };
  }

  // A result never moves between profiles.
  if (existing.profileId !== command.profileId) return { kind: 'conflict', current: existing };
  // A retry of the same write, or the same value checked again with nothing in between.
  if (existing.lastSubmissionKey === submissionKey || existing.lastSubmittedAnswer === answer) {
    return { kind: 'duplicate', current: existing };
  }
  if (existing.solved) return { kind: 'alreadySolved', current: existing };
  if (existing.revision !== command.expectedRevision) return { kind: 'conflict', current: existing };

  // First-attempt fields and the first-check date stay locked.
  const next: ExerciseResult = {
    ...existing,
    attemptCount: existing.attemptCount + 1,
    lastSubmittedAnswer: answer,
    lastSubmissionKey: submissionKey,
    revision: existing.revision + 1,
  };
  if (correct) {
    next.solved = true;
    next.solvedAt = checkedAt;
  }
  return { kind: 'update', next };
}
