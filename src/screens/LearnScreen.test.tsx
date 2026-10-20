import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActiveProfileProvider } from '../app/ActiveProfileContext';
import { LearnScreen } from './LearnScreen';

describe('LearnScreen skeleton', () => {
  it('renders the title and progress heading without fake data', () => {
    const { container } = render(
      <ActiveProfileProvider initialProfileId="test-profile">
        <LearnScreen />
      </ActiveProfileProvider>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'לוח הכפל' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'ההתקדמות שלי' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/%/);
  });
});
