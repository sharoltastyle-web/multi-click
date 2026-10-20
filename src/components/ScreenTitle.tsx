import { forwardRef } from 'react';
import styles from './ScreenTitle.module.css';

/** Comic-style screen heading; focusable so route changes can move focus to it. */
export const ScreenTitle = forwardRef<HTMLHeadingElement, { children: string }>(
  function ScreenTitle({ children }, ref) {
    return (
      <h1 ref={ref} tabIndex={-1} className={styles.title}>
        {children}
      </h1>
    );
  },
);
