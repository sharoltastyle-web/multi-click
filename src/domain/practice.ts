export const FACTOR_MIN = 1;
export const FACTOR_MAX = 10;
export const ANSWER_MIN = 1;
export const ANSWER_MAX = 100;

export const SUCCESS_MESSAGE = 'כל הכבוד! תשובה נכונה';
export const RETRY_MESSAGE = 'עוד ניסיון, אפשר להצליח!';
export const INVALID_ANSWER_MESSAGE = 'יש להקליד מספר שלם בין 1 ל־100';
export const RESULTS_NOT_SAVED_MESSAGE = 'התוצאות לא נשמרו במכשיר';

export type PracticeMode = 'random' | 'selectedFactor';

export interface Exercise {
  id: string;
  factorA: number;
  factorB: number;
  mode: PracticeMode;
  selectedFactor?: number;
}

export type Random = () => number;

export function randomFactor(random: Random = Math.random): number {
  const value = FACTOR_MIN + Math.floor(random() * (FACTOR_MAX - FACTOR_MIN + 1));
  // Guard against a random source that returns exactly 1.
  return Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, value));
}

export function isFactor(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= FACTOR_MIN && (value as number) <= FACTOR_MAX;
}

/** A new exercise instance; in selected-factor mode the chosen factor is always the first one. */
export function createExercise(
  mode: PracticeMode,
  selectedFactor: number,
  random: Random = Math.random,
): Exercise {
  const id = crypto.randomUUID();
  if (mode === 'selectedFactor') {
    if (!isFactor(selectedFactor)) throw new Error(`Invalid factor: ${selectedFactor}`);
    return { id, mode, selectedFactor, factorA: selectedFactor, factorB: randomFactor(random) };
  }
  return { id, mode, factorA: randomFactor(random), factorB: randomFactor(random) };
}

export type AnswerValidation = { ok: true; value: number } | { ok: false };

/** Accepts only whole numbers 1–100 written with digits; partial input like "12abc" is rejected. */
export function validateAnswer(text: string): AnswerValidation {
  const trimmed = text.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  if (value < ANSWER_MIN || value > ANSWER_MAX) return { ok: false };
  return { ok: true, value };
}

export function productOf(exercise: Pick<Exercise, 'factorA' | 'factorB'>): number {
  return exercise.factorA * exercise.factorB;
}

export function isCorrectAnswer(
  exercise: Pick<Exercise, 'factorA' | 'factorB'>,
  answer: number,
): boolean {
  return answer === productOf(exercise);
}

/**
 * Repeated-addition terms that do not reveal the product:
 * a × b is b added a times; when the first factor is 1, 1 is added b times instead.
 */
export function hintTerms(exercise: Pick<Exercise, 'factorA' | 'factorB'>): number[] {
  const { factorA, factorB } = exercise;
  if (factorA === 1) return Array.from({ length: factorB }, () => 1);
  return Array.from({ length: factorA }, () => factorB);
}

export const HINT_PREFIX = 'אפשר לחשב';

export function hintExpression(exercise: Pick<Exercise, 'factorA' | 'factorB'>): string {
  return hintTerms(exercise).join(' + ');
}
