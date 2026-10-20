import { useActiveProfile } from '../app/ActiveProfileContext';
import { useProgress } from '../app/useProgress';
import { Avatar } from '../components/Avatar';
import { PracticePanel } from '../components/PracticePanel';
import { ProgressSection } from '../components/ProgressSection';
import { ScreenHeader } from '../components/ScreenHeader';
import { toLocalDateKey } from '../domain/exerciseResult';
import styles from './Screen.module.css';

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
      {/* Keyed by profile id: switching profiles discards the in-memory exercise and progress. */}
      {activeProfile && <ProfileLearning key={activeProfile.id} profileId={activeProfile.id} />}
    </div>
  );
}

/** Practice and progress of one profile; a successful save refreshes the progress. */
function ProfileLearning({ profileId }: { profileId: string }) {
  const progress = useProgress(profileId);
  return (
    <>
      <PracticePanel profileId={profileId} onResultSaved={progress.reload} />
      <hr className={styles.divider} />
      <section aria-labelledby="progress-title" className={styles.section}>
        <h2 id="progress-title" className={styles.sectionTitle}>
          ההתקדמות שלי
        </h2>
        <ProgressSection
          status={progress.status}
          days={progress.days}
          todayKey={toLocalDateKey(Date.now())}
        />
      </section>
    </>
  );
}
