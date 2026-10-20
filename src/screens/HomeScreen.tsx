import { useState } from 'react';
import heroImage from '../assets/images/hero.webp';
import { useActiveProfile } from '../app/ActiveProfileContext';
import { ROUTE_HASH } from '../app/routes';
import { useProfiles } from '../app/useProfiles';
import { Button } from '../components/Button';
import { NewProfileForm } from '../components/NewProfileForm';
import { ProfileCard } from '../components/ProfileCard';
import { ScreenTitle } from '../components/ScreenTitle';
import type { Profile } from '../domain/profile';
import styles from './HomeScreen.module.css';

export const STORAGE_UNAVAILABLE = 'לא ניתן לשמור פרופילים במכשיר הזה כרגע.';
export const SELECT_PROFILE_FIRST = 'יש לבחור פרופיל לפני התרגול';

export function HomeScreen() {
  const { activeProfile, selectProfile } = useActiveProfile();
  const { status, profiles, createProfile } = useProfiles();
  const [showSelectHint, setShowSelectHint] = useState(false);
  // With existing profiles the new-profile form stays folded until asked for.
  const [formOpen, setFormOpen] = useState(false);

  function goToLearn() {
    if (activeProfile) {
      window.location.hash = ROUTE_HASH.learn;
    } else {
      setShowSelectHint(true);
    }
  }

  function handleSelect(profile: Profile) {
    selectProfile(profile);
    setShowSelectHint(false);
  }

  function handleCreated(profile: Profile) {
    handleSelect(profile);
    setFormOpen(false);
  }

  const hasProfiles = status === 'ready' && profiles.length > 0;

  return (
    <div className={styles.screen}>
      <header className={styles.hero}>
        <img
          className={styles.heroImage}
          src={heroImage}
          alt="ילדים בהרפתקה ליד טירה ומפל, עם שלט של תרגיל כפל"
          width={960}
          height={560}
        />
        <div className={styles.heroTitle}>
          <ScreenTitle>כפל בכיף</ScreenTitle>
        </div>
      </header>

      {status === 'error' && (
        <p role="alert" className={styles.notice}>
          {STORAGE_UNAVAILABLE}
        </p>
      )}

      {hasProfiles && (
        <section aria-labelledby="choose-profile-title" className={styles.section}>
          <h2 id="choose-profile-title" className={styles.sectionTitle}>
            בחירת פרופיל
          </h2>
          <ul className={styles.profiles}>
            {profiles.map((profile) => (
              <li key={profile.id}>
                <ProfileCard
                  profile={profile}
                  selected={activeProfile?.id === profile.id}
                  onSelect={handleSelect}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {status !== 'loading' &&
        (!hasProfiles || formOpen ? (
          <NewProfileForm onCreate={createProfile} onCreated={handleCreated} autoFocus={formOpen} />
        ) : (
          <button type="button" className={styles.newProfileToggle} onClick={() => setFormOpen(true)}>
            <span aria-hidden="true">+</span>
            <span>פרופיל חדש</span>
          </button>
        ))}

      <div className={styles.section}>
        <Button variant="primary" onClick={goToLearn}>
          ללימוד לוח הכפל
        </Button>
        <p role="status" className={styles.hint}>
          {showSelectHint && !activeProfile ? SELECT_PROFILE_FIRST : ''}
        </p>
      </div>
    </div>
  );
}
