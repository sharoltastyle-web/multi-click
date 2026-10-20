import type { PwaDisplay } from '../pwa/pwaStatus';
import { PWA_NEEDS_CONNECTION_MESSAGE, PWA_READY_MESSAGE } from '../pwa/pwaStatus';
import { FeedbackMessage } from './FeedbackMessage';
import styles from './PwaBanner.module.css';

/** Thin offline-readiness strip at the top of every screen; in the page flow, never over content. */
export function PwaBanner({ display }: { display: PwaDisplay }) {
  return (
    <div role="status" className={display === 'none' ? undefined : styles.banner}>
      {display === 'readyMessage' && (
        <FeedbackMessage variant="success">{PWA_READY_MESSAGE}</FeedbackMessage>
      )}
      {display === 'needsConnection' && (
        <FeedbackMessage variant="retry">{PWA_NEEDS_CONNECTION_MESSAGE}</FeedbackMessage>
      )}
    </div>
  );
}
