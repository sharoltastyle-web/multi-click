import { ROUTE_HASH } from '../app/routes';
import { ButtonLink } from '../components/Button';
import { ScreenTitle } from '../components/ScreenTitle';
import styles from './Screen.module.css';

// The multiplication table and explanation text are added in Milestone 2.
export function AboutScreen() {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <ScreenTitle>אודות כפל בכיף</ScreenTitle>
      </header>
      <ButtonLink href={ROUTE_HASH.home} variant="secondary">
        חזרה לבית
      </ButtonLink>
    </div>
  );
}
