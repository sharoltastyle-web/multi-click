import type { AvatarId } from '../domain/avatars';
import type { Profile } from '../domain/profile';
import { getDb, type AppDb } from './db';

export type Result<T> = { ok: true; value: T } | { ok: false; error: 'storage' };

export interface ProfileRepository {
  listProfiles(): Promise<Result<Profile[]>>;
  createProfile(input: { nickname: string; avatarId: AvatarId }): Promise<Result<Profile>>;
}

export function createProfileRepository(db: () => AppDb = getDb): ProfileRepository {
  return {
    async listProfiles() {
      try {
        const profiles = await db().profiles.toArray();
        profiles.sort((a, b) => a.createdAt - b.createdAt);
        return { ok: true, value: profiles };
      } catch (error) {
        console.error('Failed to load profiles', error);
        return { ok: false, error: 'storage' };
      }
    },

    async createProfile({ nickname, avatarId }) {
      const profile: Profile = {
        id: crypto.randomUUID(),
        nickname: nickname.trim(),
        avatarId,
        createdAt: Date.now(),
      };
      try {
        await db().profiles.add(profile);
        return { ok: true, value: profile };
      } catch (error) {
        console.error('Failed to save profile', error);
        return { ok: false, error: 'storage' };
      }
    },
  };
}

export const profileRepository = createProfileRepository();
