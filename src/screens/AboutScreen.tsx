import { ROUTE_HASH } from '../app/routes';
import { ButtonLink } from '../components/Button';
import { MultiplicationTable } from '../components/MultiplicationTable';
import { ScreenHeader } from '../components/ScreenHeader';
import styles from './Screen.module.css';

export function AboutScreen() {
  return (
    <div className={styles.screen}>
      <ScreenHeader title="אודות כפל בכיף" />
      <MultiplicationTable />
      <div className={styles.text}>
        <p>
          תרגול לוח הכפל לילדים בגילאי <bdi>7–8</bdi>.
        </p>
        <p>בוחרים תרגול אקראי או כפולה.</p>
        <p>מקלידים תשובה ולוחצים על בדיקה.</p>
        <p>טעות? מקבלים רמז ומנסים שוב.</p>
        <p>אחרי הצלחה ממשיכים לתרגיל הבא.</p>
        <p>הגרף מציג הצלחה בניסיון הראשון.</p>
        <p>התוצאות נשמרות במכשיר לכל פרופיל.</p>
        <p>באייפון מומלץ להוסיף את האפליקציה למסך הבית, כדי שהתוצאות יישמרו לאורך זמן.</p>
      </div>
      <ButtonLink href={ROUTE_HASH.home} variant="secondary">
        חזרה לבית
      </ButtonLink>
    </div>
  );
}
