import type { ReactNode } from 'react';
import headerBg from '../assets/images/header-bg.webp';
import { ScreenTitle } from './ScreenTitle';
import styles from './ScreenHeader.module.css';

/** Screen title on the illustrated header background (learn and about screens). */
export function ScreenHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className={styles.header} style={{ backgroundImage: `url(${headerBg})` }}>
      <ScreenTitle>{title}</ScreenTitle>
      {children}
    </header>
  );
}
