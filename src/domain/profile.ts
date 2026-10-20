import type { AvatarId } from './avatars';

export interface Profile {
  id: string;
  nickname: string;
  avatarId: AvatarId;
  createdAt: number;
}

export const NICKNAME_MAX_LENGTH = 20;
