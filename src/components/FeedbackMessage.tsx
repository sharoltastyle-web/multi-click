import type { ReactNode } from 'react';
import styles from './FeedbackMessage.module.css';

type Variant = 'success' | 'retry';

function Icon({ variant }: { variant: Variant }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle
        cx="12"
        cy="12"
        r="10.5"
        className={variant === 'success' ? styles.iconSuccess : styles.iconRetry}
      />
      {variant === 'success' ? (
        <path d="M7 12.5l3.2 3.2L17 9" className={styles.iconMark} />
      ) : (
        <>
          <path d="M12 6.5v7" className={styles.iconMark} />
          <circle cx="12" cy="17.3" r="1.4" className={styles.iconDot} />
        </>
      )}
    </svg>
  );
}

/** Success or try-again strip from the Style Guide; text and icon, never color alone. */
export function FeedbackMessage({ variant, children }: { variant: Variant; children: ReactNode }) {
  return (
    <div className={`${styles.message} ${styles[variant]}`}>
      <Icon variant={variant} />
      <div className={styles.body}>{children}</div>
    </div>
  );
}
