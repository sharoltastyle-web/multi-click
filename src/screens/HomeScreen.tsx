import { ROUTE_HASH } from '../app/routes';
import { ButtonLink } from '../components/Button';
import { ScreenTitle } from '../components/ScreenTitle';
import styles from './Screen.module.css';

// Hero, profile cards and the new-profile form are added in Milestone 2.
export function HomeScreen() {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <ScreenTitle>כפל בכיף</ScreenTitle>
      </header>
      <ButtonLink href={ROUTE_HASH.learn} variant="primary">
        ללימוד לוח הכפל
      </ButtonLink>
    </div>
  );
}
