import avatar1 from '../assets/images/avatar-1.webp';
import avatar2 from '../assets/images/avatar-2.webp';
import avatar3 from '../assets/images/avatar-3.webp';

export type AvatarId = 'avatar-1' | 'avatar-2' | 'avatar-3';

export interface Avatar {
  id: AvatarId;
  src: string;
  alt: string;
}

/** The built-in avatar choices; avatar images are only ever loaded from this list. */
export const AVATARS: readonly Avatar[] = [
  { id: 'avatar-1', src: avatar1, alt: 'ילד עם כובע כחול' },
  { id: 'avatar-2', src: avatar2, alt: 'ילדה עם שיער חום' },
  { id: 'avatar-3', src: avatar3, alt: 'ילד עם רקע ירוק' },
];

export function isAvatarId(value: unknown): value is AvatarId {
  return AVATARS.some((avatar) => avatar.id === value);
}

export function getAvatar(id: AvatarId): Avatar {
  const avatar = AVATARS.find((a) => a.id === id);
  if (!avatar) throw new Error(`Unknown avatar: ${id}`);
  return avatar;
}
