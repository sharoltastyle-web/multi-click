import { useCallback, useEffect, useState } from 'react';
import type { AvatarId } from '../domain/avatars';
import type { Profile } from '../domain/profile';
import { profileRepository, type Result } from '../persistence/profileRepository';

export type ProfilesStatus = 'loading' | 'ready' | 'error';

/** Loads the saved profiles and creates new ones through the repository. */
export function useProfiles() {
  const [status, setStatus] = useState<ProfilesStatus>('loading');
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    let cancelled = false;
    void profileRepository.listProfiles().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setProfiles(result.value);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const createProfile = useCallback(
    async (input: { nickname: string; avatarId: AvatarId }): Promise<Result<Profile>> => {
      const result = await profileRepository.createProfile(input);
      // Only a committed write is shown in the list.
      if (result.ok) setProfiles((current) => [...current, result.value]);
      return result;
    },
    [],
  );

  return { status, profiles, createProfile };
}
