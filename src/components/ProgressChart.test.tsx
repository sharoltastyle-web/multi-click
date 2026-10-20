import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DailyProgress } from '../domain/progress';
import { ProgressChart } from './ProgressChart';

function day(date: string, accuracy: number): DailyProgress {
  return { date, checkedCount: 10, firstCorrectCount: accuracy / 10, accuracy };
}

const texts = (container: HTMLElement) =>
  [...container.querySelectorAll('text')].map((t) => t.textContent);
const dots = (container: HTMLElement) => [...container.querySelectorAll('circle')];

describe('ProgressChart', () => {
  it('draws a fixed 0–100% axis, one dot per day, labels and a line', () => {
    const { container, getByRole } = render(
      <ProgressChart
        days={[day('2026-10-17', 40), day('2026-10-18', 60), day('2026-10-19', 80)]}
      />,
    );
    const labels = texts(container);
    for (const tick of ['0%', '20%', '40%', '60%', '80%', '100%']) expect(labels).toContain(tick);
    expect(labels).toEqual(expect.arrayContaining(['17.10', '18.10', '19.10']));
    expect(dots(container)).toHaveLength(3);
    expect(container.querySelector('polyline')).not.toBeNull();
    expect(getByRole('img').getAttribute('aria-label')).toBe(
      'אחוז הצלחה בניסיון הראשון: 17.10 40%, 18.10 60%, 19.10 80%',
    );
  });

  it('shows a single day as one dot without a line', () => {
    const { container } = render(<ProgressChart days={[day('2026-10-19', 80)]} />);
    expect(dots(container)).toHaveLength(1);
    expect(container.querySelector('polyline')).toBeNull();
    expect(texts(container)).toEqual(expect.arrayContaining(['19.10', '80%']));
  });

  it('shows only the latest 7 practice days', () => {
    const days = Array.from({ length: 9 }, (_, i) => day(`2026-10-${10 + i}`, 50));
    const { container } = render(<ProgressChart days={days} />);
    expect(dots(container)).toHaveLength(7);
    expect(texts(container)).not.toContain('10.10');
    expect(texts(container)).toContain('12.10');
  });

  it('spaces practice days evenly and shows every label, even after a long break', () => {
    const { container } = render(
      <ProgressChart
        days={[day('2026-09-01', 40), day('2026-10-29', 60), day('2026-10-30', 80)]}
      />,
    );
    const xs = dots(container).map((c) => Number(c.getAttribute('cx')));
    expect(xs[2]! - xs[1]!).toBeCloseTo(xs[1]! - xs[0]!);
    expect(texts(container)).toEqual(
      expect.arrayContaining(['1.9', '29.10', '30.10', '40%', '60%', '80%']),
    );
  });
});
