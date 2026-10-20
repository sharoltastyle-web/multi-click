import { useEffect, useId, useRef, type FormEvent } from 'react';
import { usePractice } from '../app/usePractice';
import {
  HINT_PREFIX,
  hintExpression,
  INVALID_ANSWER_MESSAGE,
  RESULTS_NOT_SAVED_MESSAGE,
  RETRY_MESSAGE,
  SUCCESS_MESSAGE,
  type Random,
} from '../domain/practice';
import type { ExerciseResultRepository } from '../persistence/exerciseResultRepository';
import { Button } from './Button';
import { FeedbackMessage } from './FeedbackMessage';
import { MathExpression } from './MathExpression';
import { PracticeModePicker } from './PracticeModePicker';
import { TextField } from './TextField';
import styles from './PracticePanel.module.css';

/** Practice type, one exercise, answer check, feedback and the manual "next" step. */
export function PracticePanel({
  profileId,
  repository,
  random,
  onResultSaved,
}: {
  profileId: string;
  repository?: ExerciseResultRepository;
  random?: Random;
  onResultSaved?: () => void;
}) {
  const ids = useId();
  const { state, check, setAnswerText, changeMode, changeFactor, next } = usePractice(profileId, {
    repository,
    random,
    onResultSaved,
  });
  const { exercise, phase } = state;
  const answerRef = useRef<HTMLInputElement>(null);
  const firstExerciseId = useRef(exercise.id);

  const feedbackRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // A new exercise after "next" puts the cursor back in the answer field.
  useEffect(() => {
    if (exercise.id !== firstExerciseId.current) answerRef.current?.focus();
  }, [exercise.id]);

  // On short screens the feedback (and "next") can fall below the fold: bring it into view.
  useEffect(() => {
    const target = phase === 'correct' ? nextRef.current : phase === 'incorrect' ? feedbackRef.current : null;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView?.({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [phase]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void check();
  }

  const saving = phase === 'saving';
  const solved = phase === 'correct';
  const errorId = `${ids}-answer-error`;

  return (
    <div className={styles.panel}>
      <PracticeModePicker
        mode={state.mode}
        selectedFactor={state.selectedFactor}
        disabled={saving}
        onModeChange={changeMode}
        onFactorChange={changeFactor}
      />

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <p className={styles.exercise}>
          <MathExpression a={exercise.factorA} b={exercise.factorB} />
        </p>

        <div>
          <TextField
            ref={answerRef}
            label="התשובה שלך"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="done"
            maxLength={3}
            value={state.answerText}
            readOnly={solved}
            onChange={(e) => setAnswerText(e.target.value)}
            aria-invalid={state.invalidAnswer ? true : undefined}
            aria-describedby={state.invalidAnswer ? errorId : undefined}
          />
          <p id={errorId} className={styles.error} aria-live="polite">
            {state.invalidAnswer ? INVALID_ANSWER_MESSAGE : ''}
          </p>
        </div>

        <Button type="submit" variant="primary" disabled={saving || solved}>
          בדיקה
        </Button>
      </form>

      <div ref={feedbackRef} className={styles.feedback} aria-live="polite">
        {phase === 'correct' && (
          <FeedbackMessage variant="success">
            <span>{SUCCESS_MESSAGE}</span>
          </FeedbackMessage>
        )}
        {phase === 'incorrect' && (
          <FeedbackMessage variant="retry">
            <span>{RETRY_MESSAGE}</span>
            <span className={styles.hint}>
              {HINT_PREFIX} <bdi dir="ltr">{hintExpression(exercise)}</bdi>
            </span>
          </FeedbackMessage>
        )}
      </div>

      {state.notSaved && (
        <p role="alert" className={styles.notSaved}>
          {RESULTS_NOT_SAVED_MESSAGE}
        </p>
      )}

      {solved && (
        <Button ref={nextRef} variant="secondary" className={styles.next} onClick={next}>
          לתרגיל הבא
        </Button>
      )}
    </div>
  );
}
