import styles from './MathExpression.module.css';

/** Renders "a × b = ?" as an isolated LTR run so RTL never reorders it. */
export function MathExpression({ a, b }: { a: number; b: number }) {
  return (
    <bdi dir="ltr" className={styles.expression}>
      <span className={styles.factor}>{a}</span>
      <span className={styles.times}>×</span>
      <span className={styles.factor}>{b}</span>
      <span className={styles.factor}>=</span>
      <span className={styles.question}>?</span>
    </bdi>
  );
}
