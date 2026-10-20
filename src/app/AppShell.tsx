import { useEffect, useRef } from 'react';
import { BottomNav } from '../components/BottomNav';
import { AboutScreen } from '../screens/AboutScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LearnScreen } from '../screens/LearnScreen';
import { useActiveProfile } from './ActiveProfileContext';
import { useHashRoute } from './useHashRoute';
import styles from './AppShell.module.css';

export function AppShell() {
  const { activeProfile } = useActiveProfile();
  const route = useHashRoute(activeProfile !== null);
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // On screen change: start at the top and move focus to the new screen title.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.querySelector<HTMLElement>('h1')?.focus();
  }, [route]);

  return (
    <div className={styles.shell}>
      <main ref={mainRef} className={styles.main}>
        {route === 'home' && <HomeScreen />}
        {route === 'learn' && <LearnScreen />}
        {route === 'about' && <AboutScreen />}
      </main>
      <BottomNav active={route} />
    </div>
  );
}
