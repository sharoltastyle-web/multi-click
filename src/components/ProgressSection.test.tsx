import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DailyProgress } from '../domain/progress';
import {
  NO_RESULTS_MESSAGE,
  PROGRESS_LOAD_ERROR_MESSAGE,
  ProgressSection,
} from './ProgressSection';

const TODAY = '2026-10-19';
const day = (date: string, checked: number, correct: number): DailyProgress => ({
  date,
  checkedCount: checked,
  firstCorrectCount: correct,
  accuracy: (100 * correct) / checked,
});

describe('ProgressSection', () => {
  it('shows the PRD message and no chart without results', () => {
    const { container } = render(<ProgressSection status="ready" days={[]} todayKey={TODAY} />);
    expect(screen.getByText(NO_RESULTS_MESSAGE)).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('shows a clear error when the results cannot be loaded', () => {
    render(<ProgressSection status="error" days={[]} todayKey={TODAY} />);
    expect(screen.getByRole('alert')).toHaveTextContent(PROGRESS_LOAD_ERROR_MESSAGE);
  });

  it('shows today summary from the data', () => {
    const { container } = render(
      <ProgressSection status="ready" days={[day(TODAY, 10, 8)]} todayKey={TODAY} />,
    );
    expect(screen.getByText('היום: 10 תרגילים נבדקו')).toBeInTheDocument();
    expect(screen.getByText(/8 נכונים בניסיון הראשון/)).toHaveTextContent(
      '8 נכונים בניסיון הראשון · 80%',
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('uses singular wording for one exercise', () => {
    render(<ProgressSection status="ready" days={[day(TODAY, 1, 1)]} todayKey={TODAY} />);
    expect(screen.getByText('היום: תרגיל 1 נבדק')).toBeInTheDocument();
    expect(screen.getByText(/1 נכון בניסיון הראשון/)).toHaveTextContent(
      '1 נכון בניסיון הראשון · 100%',
    );
  });

  it('keeps the chart but shows no percentage when today was not practiced', () => {
    const { container } = render(
      <ProgressSection status="ready" days={[day('2026-10-18', 4, 3)]} todayKey={TODAY} />,
    );
    expect(screen.getByText('היום: עדיין לא נבדקו תרגילים')).toBeInTheDocument();
    expect(screen.queryByText(/בניסיון הראשון/)).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
