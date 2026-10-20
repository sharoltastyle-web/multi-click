import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INVALID_ANSWER_MESSAGE,
  RESULTS_NOT_SAVED_MESSAGE,
  RETRY_MESSAGE,
  SUCCESS_MESSAGE,
} from '../domain/practice';
import { getDb } from '../persistence/db';
import {
  createExerciseResultRepository,
  type ExerciseResultRepository,
} from '../persistence/exerciseResultRepository';
import { PracticePanel } from './PracticePanel';

// 0.25 → 3 and 0.35 → 4: every random exercise is 3 × 4.
const random = (() => {
  let i = 0;
  return () => (i++ % 2 === 0 ? 0.25 : 0.35);
})();

const answerField = () => screen.getByLabelText('התשובה שלך');
const checkButton = () => screen.getByRole('button', { name: 'בדיקה' });
const expressionText = () => document.querySelector('bdi[dir="ltr"]')!.textContent;

function answer(value: string) {
  fireEvent.change(answerField(), { target: { value } });
  fireEvent.click(checkButton());
}

function renderPanel(repository?: ExerciseResultRepository) {
  return render(<PracticePanel profileId="p1" random={random} repository={repository} />);
}

beforeEach(async () => {
  const db = getDb();
  await db.exerciseResults.clear();
  await db.profiles.clear();
  await db.profiles.add({ id: 'p1', nickname: 'דני', avatarId: 'avatar-1', createdAt: 1 });
});
afterEach(() => vi.restoreAllMocks());

describe('PracticePanel', () => {
  it('shows the mockup layout: random mode, disabled factor select, exercise, answer and check', () => {
    renderPanel();
    expect(screen.getByRole('radio', { name: 'תרגול אקראי' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'תרגול לפי כפולה' })).not.toBeChecked();
    expect(screen.getByLabelText('כפולה')).toBeDisabled();
    expect(expressionText()).toBe('3×4=?');
    expect(answerField()).toHaveAttribute('inputmode', 'numeric');
    expect(checkButton()).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'לתרגיל הבא' })).toBeNull();
  });

  it('enables the factor select in selected-factor mode and fixes the first factor', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: 'תרגול לפי כפולה' }));
    const select = screen.getByLabelText('כפולה');
    expect(select).toBeEnabled();
    fireEvent.change(select, { target: { value: '7' } });
    expect(expressionText()).toMatch(/^7×\d+=\?$/);
  });

  it('invalid input shows the message and records nothing', async () => {
    renderPanel();
    for (const value of ['', '0', '101', '12abc']) {
      answer(value);
      expect(await screen.findByText(INVALID_ANSWER_MESSAGE)).toBeInTheDocument();
    }
    expect(expressionText()).toBe('3×4=?');
    expect(await getDb().exerciseResults.count()).toBe(0);
  });

  it('a wrong answer keeps the exercise and shows encouragement and a hint', async () => {
    renderPanel();
    answer('7');
    expect(await screen.findByText(RETRY_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(/אפשר לחשב/)).toHaveTextContent('אפשר לחשב 4 + 4 + 4');
    expect(screen.queryByText(/12/)).toBeNull();
    expect(expressionText()).toBe('3×4=?');
    expect(screen.queryByRole('button', { name: 'לתרגיל הבא' })).toBeNull();
  });

  it('success shows the PRD message and moves on only after "next"', async () => {
    renderPanel();
    answer('7');
    await screen.findByText(RETRY_MESSAGE);
    answer('12');
    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(checkButton()).toBeDisabled();
    const [stored] = await getDb().exerciseResults.toArray();
    expect(stored).toMatchObject({
      profileId: 'p1',
      firstAttemptCorrect: false,
      attemptCount: 2,
      solved: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'לתרגיל הבא' }));
    await waitFor(() => expect(answerField()).toHaveValue(''));
    expect(screen.queryByText(SUCCESS_MESSAGE)).toBeNull();
    expect(answerField()).toHaveFocus();
  });

  it('a second fast tap after "next" does not open the new exercise with an error', async () => {
    renderPanel();
    answer('12');
    fireEvent.click(await screen.findByRole('button', { name: 'לתרגיל הבא' }));
    await waitFor(() => expect(answerField()).toHaveValue(''));
    fireEvent.click(checkButton());
    expect(screen.queryByText(INVALID_ANSWER_MESSAGE)).toBeNull();
  });

  it('a fast double click on check records a single attempt', async () => {
    renderPanel();
    fireEvent.change(answerField(), { target: { value: '7' } });
    fireEvent.click(checkButton());
    fireEvent.click(checkButton());
    await screen.findByText(RETRY_MESSAGE);
    // Checking the same value again is not a new attempt.
    fireEvent.click(checkButton());
    await waitFor(async () =>
      expect(await getDb().exerciseResults.toArray()).toMatchObject([{ attemptCount: 1 }]),
    );
  });

  it('a failed save shows feedback but says the results were not saved', async () => {
    const failing: ExerciseResultRepository = {
      ...createExerciseResultRepository(),
      submitAttempt: vi.fn().mockResolvedValue({ status: 'error' }),
    };
    renderPanel(failing);
    answer('12');
    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(RESULTS_NOT_SAVED_MESSAGE);
    expect(await getDb().exerciseResults.count()).toBe(0);
    // Practice continues in memory; the next exercise clears the notice.
    fireEvent.click(screen.getByRole('button', { name: 'לתרגיל הבא' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});
