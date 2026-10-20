import { describe, expect, it } from 'vitest';
import type { Exercise } from '../domain/practice';
import { initialPracticeState, practiceReducer, type PracticeState } from './practiceReducer';

const ex = (id: string, factorA = 3, factorB = 4): Exercise => ({ id, factorA, factorB, mode: 'random' });

function start(): PracticeState {
  return initialPracticeState(ex('e1'));
}

function checked(state: PracticeState, answer: number, correct: boolean): PracticeState {
  const s1 = practiceReducer(state, { type: 'checkStarted', exerciseId: state.exercise.id });
  return practiceReducer(s1, {
    type: 'checkFinished',
    exerciseId: state.exercise.id,
    answer,
    correct,
    result: { kind: 'saved', revision: state.revision + 1 },
  });
}

describe('practiceReducer', () => {
  it('starts in random mode with factor 1 and an empty answer', () => {
    expect(start()).toMatchObject({
      mode: 'random',
      selectedFactor: 1,
      phase: 'awaitingAnswer',
      answerText: '',
      revision: 0,
    });
  });

  it('a wrong answer keeps the same exercise', () => {
    const s = checked(start(), 7, false);
    expect(s).toMatchObject({ phase: 'incorrect', lastCheckedAnswer: 7, revision: 1 });
    expect(s.exercise.id).toBe('e1');
  });

  it('a correct answer locks the exercise until "next"', () => {
    let s = checked(start(), 12, true);
    expect(s.phase).toBe('correct');
    s = practiceReducer(s, { type: 'answerChanged', text: '99' });
    expect(s.answerText).toBe('');
    expect(practiceReducer(s, { type: 'checkStarted', exerciseId: 'e1' })).toBe(s);
  });

  it('"next" moves on only once per solved exercise', () => {
    const solved = checked(start(), 12, true);
    const s1 = practiceReducer(solved, { type: 'nextExercise', fromExerciseId: 'e1', exercise: ex('e2') });
    expect(s1).toMatchObject({ phase: 'awaitingAnswer', answerText: '', revision: 0 });
    expect(s1.exercise.id).toBe('e2');
    // A second fast click carries the old id and is ignored.
    const s2 = practiceReducer(s1, { type: 'nextExercise', fromExerciseId: 'e1', exercise: ex('e3') });
    expect(s2).toBe(s1);
  });

  it('"next" is ignored while the exercise is not solved', () => {
    const wrong = checked(start(), 7, false);
    expect(practiceReducer(wrong, { type: 'nextExercise', fromExerciseId: 'e1', exercise: ex('e2') })).toBe(
      wrong,
    );
  });

  it('marks invalid input without changing the exercise', () => {
    const s = practiceReducer(start(), { type: 'invalidAnswer' });
    expect(s).toMatchObject({ invalidAnswer: true, phase: 'awaitingAnswer' });
    expect(practiceReducer(s, { type: 'answerChanged', text: '1' }).invalidAnswer).toBe(false);
  });

  it('changing mode or factor creates a new exercise, but not while saving', () => {
    const saving = practiceReducer(start(), { type: 'checkStarted', exerciseId: 'e1' });
    expect(
      practiceReducer(saving, { type: 'modeChanged', mode: 'selectedFactor', exercise: ex('e2', 7) }),
    ).toBe(saving);

    const s1 = practiceReducer(start(), {
      type: 'modeChanged',
      mode: 'selectedFactor',
      exercise: { id: 'e2', factorA: 1, factorB: 5, mode: 'selectedFactor', selectedFactor: 1 },
    });
    expect(s1).toMatchObject({ mode: 'selectedFactor', phase: 'awaitingAnswer' });
    const s2 = practiceReducer(s1, {
      type: 'factorChanged',
      factor: 7,
      exercise: { id: 'e3', factorA: 7, factorB: 2, mode: 'selectedFactor', selectedFactor: 7 },
    });
    expect(s2).toMatchObject({ selectedFactor: 7, exercise: { id: 'e3', factorA: 7 } });
  });

  it('ignores a late result for an exercise that is no longer shown', () => {
    const s1 = practiceReducer(start(), {
      type: 'modeChanged',
      mode: 'selectedFactor',
      exercise: ex('e2'),
    });
    const late = practiceReducer(s1, {
      type: 'checkFinished',
      exerciseId: 'e1',
      answer: 12,
      correct: true,
      result: { kind: 'saved', revision: 1 },
    });
    expect(late).toBe(s1);
  });

  it('a failed save shows feedback in memory and flags the exercise until the next one', () => {
    const saving = practiceReducer(start(), { type: 'checkStarted', exerciseId: 'e1' });
    const failed = practiceReducer(saving, {
      type: 'checkFinished',
      exerciseId: 'e1',
      answer: 12,
      correct: true,
      result: { kind: 'notSaved' },
    });
    expect(failed).toMatchObject({ phase: 'correct', notSaved: true, revision: 0 });
    const next = practiceReducer(failed, { type: 'nextExercise', fromExerciseId: 'e1', exercise: ex('e2') });
    expect(next.notSaved).toBe(false);
  });
});
