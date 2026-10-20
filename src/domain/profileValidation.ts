import { isAvatarId, type AvatarId } from './avatars';

export const NICKNAME_REQUIRED = 'יש להקליד כינוי';
export const AVATAR_REQUIRED = 'יש לבחור אווטאר';

export type NewProfileValidation =
  | { ok: true; value: { nickname: string; avatarId: AvatarId } }
  | { ok: false; errors: { nickname?: string; avatar?: string } };

/** Validates the new-profile form; the nickname is trimmed and the avatar must be a built-in one. */
export function validateNewProfile(nickname: string, avatarId: string | null): NewProfileValidation {
  const trimmed = nickname.trim();
  const errors: { nickname?: string; avatar?: string } = {};
  if (trimmed === '') errors.nickname = NICKNAME_REQUIRED;
  if (!isAvatarId(avatarId)) errors.avatar = AVATAR_REQUIRED;
  if (errors.nickname || errors.avatar || !isAvatarId(avatarId)) return { ok: false, errors };
  return { ok: true, value: { nickname: trimmed, avatarId } };
}
