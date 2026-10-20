import { ScreenTitle } from '../components/ScreenTitle';
import styles from './Screen.module.css';

// Practice is added in Milestone 3 and the progress chart in Milestone 4.
export function LearnScreen() {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <ScreenTitle>לוח הכפל</ScreenTitle>
      </header>
      <hr className={styles.divider} />
      <section aria-labelledby="progress-title">
        <h2 id="progress-title" className={styles.sectionTitle}>
          ההתקדמות שלי
        </h2>
      </section>
    </div>
  );
}
