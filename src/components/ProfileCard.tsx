import type { Profile } from '../domain/profile';
import { Avatar } from './Avatar';
import styles from './ProfileCard.module.css';

export function ProfileCard({
  profile,
  selected,
  onSelect,
}: {
  profile: Profile;
  selected: boolean;
  onSelect: (profile: Profile) => void;
}) {
  return (
    <button
      type="button"
      className={selected ? `${styles.card} ${styles.selected}` : styles.card}
      aria-pressed={selected}
      onClick={() => onSelect(profile)}
    >
      <Avatar avatarId={profile.avatarId} size={80} decorative />
      <span className={styles.nickname}>{profile.nickname}</span>
    </button>
  );
}
