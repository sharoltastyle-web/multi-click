import type { ReactNode } from 'react';
import { ROUTE_HASH, type Route } from '../app/routes';
import { ChartIcon, HomeIcon, InfoIcon } from './NavIcons';
import styles from './BottomNav.module.css';

// DOM order home → learn → about renders right-to-left under dir="rtl".
const ITEMS: { route: Route; label: string; icon: ReactNode }[] = [
  { route: 'home', label: 'בית', icon: <HomeIcon /> },
  { route: 'learn', label: 'לימוד', icon: <ChartIcon /> },
  { route: 'about', label: 'אודות', icon: <InfoIcon /> },
];

export function BottomNav({ active }: { active: Route }) {
  return (
    <nav className={styles.nav} aria-label="ניווט ראשי">
      <ul className={styles.list}>
        {ITEMS.map((item) => {
          const isActive = item.route === active;
          return (
            <li key={item.route} className={styles.item}>
              <a
                href={ROUTE_HASH[item.route]}
                className={isActive ? `${styles.link} ${styles.active}` : styles.link}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
