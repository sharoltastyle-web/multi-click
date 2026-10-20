import { useActiveProfile } from '../app/ActiveProfileContext';
import { Avatar } from '../components/Avatar';
import { ScreenHeader } from '../components/ScreenHeader';
import styles from './Screen.module.css';

// Practice is added in Milestone 3 and the progress chart in Milestone 4.
export function LearnScreen() {
  const { activeProfile } = useActiveProfile();
  return (
    <div className={styles.screen}>
      <ScreenHeader title="לוח הכפל">
        {activeProfile && (
          <p className={styles.activeProfile}>
            <Avatar avatarId={activeProfile.avatarId} size={56} decorative />
            <span>{activeProfile.nickname}</span>
          </p>
        )}
      </ScreenHeader>
      <hr className={styles.divider} />
      <section aria-labelledby="progress-title">
        <h2 id="progress-title" className={styles.sectionTitle}>
          ההתקדמות שלי
        </h2>
      </section>
    </div>
  );
}
