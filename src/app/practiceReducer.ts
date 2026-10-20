import { FACTOR_MIN, type Exercise, type PracticeMode } from '../domain/practice';

export type PracticePhase = 'awaitingAnswer' | 'saving' | 'incorrect' | 'correct';

export interface PracticeState {
  mode: PracticeMode;
  selectedFactor: number;
  exercise: Exercise;
  answerText: string;
  phase: PracticePhase;
  invalidAnswer: boolean;
  /** The last valid value checked for this exercise, used to skip an unchanged re-check. */
  lastCheckedAnswer: number | null;
  /** Revision of the stored result as last confirmed by storage; 0 before the first save. */
  revision: number;
  /** A save failed for this exercise; it continues in memory only. */
  notSaved: boolean;
}

export type CheckResult =
  | { kind: 'saved'; revision: number }
  | { kind: 'notSaved' };

export type PracticeAction =
  | { type: 'answerChanged'; text: string }
  | { type: 'invalidAnswer' }
  | { type: 'checkStarted'; exerciseId: string }
  | {
      type: 'checkFinished';
      exerciseId: string;
      answer: number;
      correct: boolean;
      result: CheckResult;
    }
  | { type: 'modeChanged'; mode: PracticeMode; exercise: Exercise }
  | { type: 'factorChanged'; factor: number; exercise: Exercise }
  | { type: 'nextExercise'; fromExerciseId: string; exercise: Exercise };

export const DEFAULT_SELECTED_FACTOR = FACTOR_MIN;

export function initialPracticeState(exercise: Exercise): PracticeState {
  return freshExercise(
    {
      mode: exercise.mode,
      selectedFactor: exercise.selectedFactor ?? DEFAULT_SELECTED_FACTOR,
    },
    exercise,
  );
}

function freshExercise(
  base: Pick<PracticeState, 'mode' | 'selectedFactor'>,
  exercise: Exercise,
): PracticeState {
  return {
    ...base,
    exercise,
    answerText: '',
    phase: 'awaitingAnswer',
    invalidAnswer: false,
    lastCheckedAnswer: null,
    revision: 0,
    notSaved: false,
  };
}

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'answerChanged':
      if (state.phase === 'correct' || state.phase === 'saving') return state;
      return { ...state, answerText: action.text, invalidAnswer: false };

    case 'invalidAnswer':
      if (state.phase === 'correct' || state.phase === 'saving') return state;
      return { ...state, invalidAnswer: true };

    case 'checkStarted':
      if (action.exerciseId !== state.exercise.id) return state;
      if (state.phase === 'correct' || state.phase === 'saving') return state;
      return { ...state, phase: 'saving', invalidAnswer: false };

    case 'checkFinished': {
      // A late answer for an exercise that is no longer shown changes nothing.
      if (action.exerciseId !== state.exercise.id || state.phase === 'correct') return state;
      const saved = action.result.kind === 'saved';
      return {
        ...state,
        phase: action.correct ? 'correct' : 'incorrect',
        invalidAnswer: false,
        lastCheckedAnswer: action.answer,
        revision: action.result.kind === 'saved' ? action.result.revision : state.revision,
        notSaved: state.notSaved || !saved,
      };
    }

    case 'modeChanged':
      if (state.phase === 'saving' || action.mode === state.mode) return state;
      return freshExercise({ mode: action.mode, selectedFactor: state.selectedFactor }, action.exercise);

    case 'factorChanged':
      if (state.phase === 'saving' || action.factor === state.selectedFactor) return state;
      return freshExercise({ mode: state.mode, selectedFactor: action.factor }, action.exercise);

    case 'nextExercise':
      // Only a solved exercise moves on, and only once per exercise.
      if (state.phase !== 'correct' || action.fromExerciseId !== state.exercise.id) return state;
      return freshExercise(state, action.exercise);
  }
}
