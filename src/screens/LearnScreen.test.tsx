import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiveProfileProvider } from '../app/ActiveProfileContext';
import { toLocalDateKey, type ExerciseResult } from '../domain/exerciseResult';
import type { Profile } from '../domain/profile';
import { getDb } from '../persistence/db';
import { exerciseResultRepository } from '../persistence/exerciseResultRepository';
import { LearnScreen } from './LearnScreen';

const profile: Profile = { id: 'p1', nickname: 'דני', avatarId: 'avatar-1', createdAt: 1 };
const other: Profile = { id: 'p2', nickname: 'נועה', avatarId: 'avatar-2', createdAt: 2 };

function stored(id: string, profileId: string, firstAttemptCorrect: boolean): ExerciseResult {
  const now = Date.now();
  return {
    id,
    profileId,
    factorA: 2,
    factorB: 5,
    mode: 'random',
    firstCheckedAt: now,
    firstCheckLocalDate: toLocalDateKey(now),
    firstAttemptCorrect,
    attemptCount: 1,
    solved: true,
    lastSubmittedAnswer: 10,
    lastSubmissionKey: `k-${id}`,
    revision: 1,
  };
}

function renderScreen(active: Profile = profile) {
  return render(
    <ActiveProfileProvider initialProfile={active}>
      <LearnScreen />
    </ActiveProfileProvider>,
  );
}

function answer(value: string) {
  fireEvent.change(screen.getByLabelText('התשובה שלך'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'בדיקה' }));
}

beforeEach(async () => {
  const db = getDb();
  await db.exerciseResults.clear();
  await db.profiles.clear();
  await db.profiles.bulkAdd([profile, other]);
  // 0.25 → 3 and 0.35 → 4: every exercise is 3 × 4.
  let i = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => (i++ % 2 === 0 ? 0.25 : 0.35));
});
afterEach(() => vi.restoreAllMocks());

describe('LearnScreen', () => {
  it('shows the active profile, practice and the empty progress message without fake data', async () => {
    const { container } = renderScreen();
    expect(screen.getByRole('heading', { level: 1, name: 'לוח הכפל' })).toBeInTheDocument();
    expect(screen.getByText('דני')).toBeInTheDocument();
    expect(container.querySelector('img[src*="avatar-1"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'בדיקה' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'ההתקדמות שלי' })).toBeInTheDocument();
    expect(await screen.findByText('עדיין אין תוצאות. אפשר להתחיל לתרגל!')).toBeInTheDocument();
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    expect(container.textContent).not.toMatch(/%|17\.10/);
  });

  it('shows the summary of the active profile only, from stored results', async () => {
    await getDb().exerciseResults.bulkAdd([
      stored('a', 'p1', true),
      stored('b', 'p1', false),
      stored('c', 'p2', true),
    ]);
    renderScreen();
    expect(await screen.findByText('היום: 2 תרגילים נבדקו')).toBeInTheDocument();
    expect(screen.getByText(/1 נכון בניסיון הראשון/)).toHaveTextContent('· 50%');
  });

  it('refreshes the progress after a saved check', async () => {
    renderScreen();
    await screen.findByText('עדיין אין תוצאות. אפשר להתחיל לתרגל!');
    answer('11');
    expect(await screen.findByText('היום: תרגיל 1 נבדק')).toBeInTheDocument();
    expect(screen.getByText(/0 נכונים בניסיון הראשון/)).toHaveTextContent('· 0%');
    answer('12');
    await screen.findByText('כל הכבוד! תשובה נכונה');
    // A corrected mistake stays a first-attempt miss.
    expect(screen.getByText('היום: תרגיל 1 נבדק')).toBeInTheDocument();
    expect(screen.getByText(/0 נכונים בניסיון הראשון/)).toBeInTheDocument();
  });

  it('does not add a failed save to the progress', async () => {
    vi.spyOn(exerciseResultRepository, 'submitAttempt').mockResolvedValue({ status: 'error' });
    renderScreen();
    await screen.findByText('עדיין אין תוצאות. אפשר להתחיל לתרגל!');
    answer('12');
    expect(await screen.findByText('התוצאות לא נשמרו במכשיר')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('עדיין אין תוצאות. אפשר להתחיל לתרגל!')).toBeInTheDocument(),
    );
  });
});
