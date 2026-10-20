import { getAvatar, type AvatarId } from '../domain/avatars';
import styles from './Avatar.module.css';

/** Round built-in avatar image; pass decorative when a text label sits next to it. */
export function Avatar({
  avatarId,
  size,
  decorative = false,
}: {
  avatarId: AvatarId;
  size: number;
  decorative?: boolean;
}) {
  const avatar = getAvatar(avatarId);
  return (
    <img
      className={styles.avatar}
      src={avatar.src}
      alt={decorative ? '' : avatar.alt}
      width={size}
      height={size}
      draggable={false}
    />
  );
}
