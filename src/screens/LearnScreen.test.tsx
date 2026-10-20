import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActiveProfileProvider } from '../app/ActiveProfileContext';
import type { Profile } from '../domain/profile';
import { LearnScreen } from './LearnScreen';

const profile: Profile = { id: 'p1', nickname: 'דני', avatarId: 'avatar-1', createdAt: 1 };

describe('LearnScreen', () => {
  it('shows the active profile and the progress heading without fake data', () => {
    const { container } = render(
      <ActiveProfileProvider initialProfile={profile}>
        <LearnScreen />
      </ActiveProfileProvider>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'לוח הכפל' })).toBeInTheDocument();
    expect(screen.getByText('דני')).toBeInTheDocument();
    expect(container.querySelector('img[src*="avatar-1"]')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'ההתקדמות שלי' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/%/);
  });
});
