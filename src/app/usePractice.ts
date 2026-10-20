import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  createExercise,
  isCorrectAnswer,
  validateAnswer,
  type PracticeMode,
  type Random,
} from '../domain/practice';
import {
  exerciseResultRepository,
  type ExerciseResultRepository,
} from '../persistence/exerciseResultRepository';
import {
  DEFAULT_SELECTED_FACTOR,
  initialPracticeState,
  practiceReducer,
  type CheckResult,
} from './practiceReducer';

const NEXT_TAP_GUARD_MS = 600;

/** Practice state for one profile; the caller remounts it (key) when the profile changes. */
export function usePractice(
  profileId: string,
  {
    repository = exerciseResultRepository,
    random = Math.random,
  }: { repository?: ExerciseResultRepository; random?: Random } = {},
) {
  const [state, dispatch] = useReducer(practiceReducer, undefined, () =>
    initialPracticeState(createExercise('random', DEFAULT_SELECTED_FACTOR, random)),
  );
  // Synchronous lock so fast repeated clicks cannot start a second write before the next render.
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  // When "next" is tapped twice quickly the layout shrinks and the second tap can land on "check";
  // an empty check right after "next" is ignored so the fresh exercise does not open with an error.
  const nextAtRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const check = useCallback(async () => {
    if (busyRef.current || state.phase === 'correct' || state.phase === 'saving') return;
    if (state.answerText.trim() === '' && Date.now() - nextAtRef.current < NEXT_TAP_GUARD_MS) return;
    const validation = validateAnswer(state.answerText);
    if (!validation.ok) {
      dispatch({ type: 'invalidAnswer' });
      return;
    }
    const answer = validation.value;
    // The same value checked again, with no other value in between, is not a new attempt.
    if (state.phase === 'incorrect' && answer === state.lastCheckedAnswer) return;

    // Capture everything now; a later profile switch or re-render cannot change it.
    const exercise = state.exercise;
    const correct = isCorrectAnswer(exercise, answer);

    if (state.notSaved) {
      dispatch({
        type: 'checkFinished',
        exerciseId: exercise.id,
        answer,
        correct,
        result: { kind: 'notSaved' },
      });
      return;
    }

    busyRef.current = true;
    dispatch({ type: 'checkStarted', exerciseId: exercise.id });
    const outcome = await repository.submitAttempt({
      profileId,
      exercise,
      answer,
      correct,
      submissionKey: crypto.randomUUID(),
      checkedAt: Date.now(),
      expectedRevision: state.revision,
    });
    busyRef.current = false;
    if (!mountedRef.current) return;

    const result: CheckResult =
      outcome.status === 'error'
        ? { kind: 'notSaved' }
        : { kind: 'saved', revision: outcome.record.revision };
    dispatch({ type: 'checkFinished', exerciseId: exercise.id, answer, correct, result });
  }, [profileId, repository, state]);

  const setAnswerText = useCallback((text: string) => {
    dispatch({ type: 'answerChanged', text });
  }, []);

  const changeMode = useCallback(
    (mode: PracticeMode) => {
      if (busyRef.current) return;
      dispatch({
        type: 'modeChanged',
        mode,
        exercise: createExercise(mode, state.selectedFactor, random),
      });
    },
    [random, state.selectedFactor],
  );

  const changeFactor = useCallback(
    (factor: number) => {
      if (busyRef.current) return;
      dispatch({
        type: 'factorChanged',
        factor,
        exercise: createExercise(state.mode, factor, random),
      });
    },
    [random, state.mode],
  );

  const next = useCallback(() => {
    if (state.phase === 'correct') nextAtRef.current = Date.now();
    dispatch({
      type: 'nextExercise',
      fromExerciseId: state.exercise.id,
      exercise: createExercise(state.mode, state.selectedFactor, random),
    });
  }, [random, state.exercise.id, state.mode, state.phase, state.selectedFactor]);

  return { state, check, setAnswerText, changeMode, changeFactor, next };
}
