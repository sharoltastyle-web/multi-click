import { useActiveProfile } from '../app/ActiveProfileContext';
import { Avatar } from '../components/Avatar';
import { PracticePanel } from '../components/PracticePanel';
import { ScreenHeader } from '../components/ScreenHeader';
import styles from './Screen.module.css';

// The progress chart and daily summary are added in Milestone 4.
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
      {/* Keyed by profile id: switching profiles discards the in-memory exercise. */}
      {activeProfile && <PracticePanel key={activeProfile.id} profileId={activeProfile.id} />}
      <hr className={styles.divider} />
      <section aria-labelledby="progress-title">
        <h2 id="progress-title" className={styles.sectionTitle}>
          ההתקדמות שלי
        </h2>
      </section>
    </div>
  );
}
