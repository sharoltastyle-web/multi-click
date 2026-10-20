import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiveProfileProvider, useActiveProfile } from '../app/ActiveProfileContext';
import { SAVE_FAILED } from '../components/NewProfileForm';
import { AVATAR_REQUIRED, NICKNAME_REQUIRED } from '../domain/profileValidation';
import { getDb } from '../persistence/db';
import { profileRepository } from '../persistence/profileRepository';
import { HomeScreen, SELECT_PROFILE_FIRST, STORAGE_UNAVAILABLE } from './HomeScreen';

function ActiveName() {
  const { activeProfile } = useActiveProfile();
  return <output data-testid="active">{activeProfile?.id ?? ''}</output>;
}

function renderHome() {
  return render(
    <ActiveProfileProvider>
      <HomeScreen />
      <ActiveName />
    </ActiveProfileProvider>,
  );
}

async function fillForm(nickname: string, avatarName: string | null) {
  fireEvent.change(await screen.findByLabelText('כינוי'), { target: { value: nickname } });
  if (avatarName) fireEvent.click(screen.getByRole('radio', { name: avatarName }));
}

const submit = () => screen.getByRole('button', { name: 'יצירת פרופיל' });

beforeEach(async () => {
  await getDb().profiles.clear();
  window.location.hash = '#/home';
});
afterEach(() => vi.restoreAllMocks());

describe('HomeScreen', () => {
  it('shows only the new-profile form when there are no profiles', async () => {
    renderHome();
    expect(await screen.findByRole('heading', { name: 'פרופיל חדש' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'בחירת פרופיל' })).toBeNull();
  });

  it('does not create a profile from incomplete input', async () => {
    renderHome();
    await fillForm('   ', null);
    fireEvent.click(submit());
    expect(await screen.findByText(NICKNAME_REQUIRED)).toBeInTheDocument();
    expect(screen.getByText(AVATAR_REQUIRED)).toBeInTheDocument();
    expect(screen.getByLabelText('כינוי')).toHaveAttribute('aria-invalid', 'true');
    expect(await getDb().profiles.count()).toBe(0);
  });

  it('creates a profile, shows its card and makes it active', async () => {
    renderHome();
    await fillForm('נועה', 'ילדה עם שיער חום');
    fireEvent.click(submit());
    const card = await screen.findByRole('button', { name: 'נועה' });
    expect(card).toHaveAttribute('aria-pressed', 'true');
    const [saved] = await getDb().profiles.toArray();
    expect(saved).toMatchObject({ nickname: 'נועה', avatarId: 'avatar-2' });
    expect(screen.getByTestId('active')).toHaveTextContent(saved!.id);
    // The form folds after creation.
    expect(screen.queryByLabelText('כינוי')).toBeNull();
    expect(screen.getByRole('button', { name: 'פרופיל חדש' })).toBeInTheDocument();
  });

  it('folds the form when profiles exist and opens it on request', async () => {
    await getDb().profiles.add({ id: 'a', nickname: 'נועה', avatarId: 'avatar-2', createdAt: 1 });
    renderHome();
    const open = await screen.findByRole('button', { name: 'פרופיל חדש' });
    expect(screen.queryByLabelText('כינוי')).toBeNull();
    fireEvent.click(open);
    expect(screen.getByLabelText('כינוי')).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'פרופיל חדש' })).toBeNull();
  });

  it('creates only one profile on a fast double click', async () => {
    renderHome();
    await fillForm('דני', 'ילד עם כובע כחול');
    fireEvent.click(submit());
    fireEvent.click(submit());
    await screen.findByRole('button', { name: 'דני' });
    expect(await getDb().profiles.count()).toBe(1);
  });

  it('shows a save failure and no card when the write fails', async () => {
    vi.spyOn(profileRepository, 'createProfile').mockResolvedValueOnce({
      ok: false,
      error: 'storage',
    });
    renderHome();
    await fillForm('דני', 'ילד עם כובע כחול');
    fireEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent(SAVE_FAILED);
    expect(screen.queryByRole('button', { name: 'דני' })).toBeNull();
    expect(screen.getByTestId('active')).toHaveTextContent('');
    expect(screen.getByLabelText('כינוי')).toHaveValue('דני');
  });

  it('shows a storage error when profiles cannot be loaded', async () => {
    vi.spyOn(profileRepository, 'listProfiles').mockResolvedValueOnce({
      ok: false,
      error: 'storage',
    });
    renderHome();
    expect(await screen.findByText(STORAGE_UNAVAILABLE)).toBeInTheDocument();
  });

  it('asks to choose a profile before going to learn', async () => {
    renderHome();
    await screen.findByLabelText('כינוי');
    fireEvent.click(screen.getByRole('button', { name: 'ללימוד לוח הכפל' }));
    expect(screen.getByText(SELECT_PROFILE_FIRST)).toHaveAttribute('role', 'status');
    expect(window.location.hash).toBe('#/home');
  });

  it('selects an existing profile by id, even with duplicate nicknames', async () => {
    await getDb().profiles.bulkAdd([
      { id: 'a', nickname: 'נועה', avatarId: 'avatar-2', createdAt: 1 },
      { id: 'b', nickname: 'נועה', avatarId: 'avatar-3', createdAt: 2 },
    ]);
    renderHome();
    const cards = await screen.findAllByRole('button', { name: 'נועה' });
    expect(cards).toHaveLength(2);
    fireEvent.click(cards[1]!);
    await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('b'));
    expect(cards[0]).toHaveAttribute('aria-pressed', 'false');
    expect(cards[1]).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'ללימוד לוח הכפל' }));
    expect(window.location.hash).toBe('#/learn');
  });
});
