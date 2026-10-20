import { multiplicationRows, TABLE_FACTORS } from '../domain/multiplicationTable';
import styles from './MultiplicationTable.module.css';

/** The 1–10 multiplication table as a real HTML table, kept LTR like the design. */
export function MultiplicationTable() {
  const rows = multiplicationRows();
  return (
    <div className={styles.wrapper}>
      <table className={styles.table} dir="ltr">
        <caption className="visually-hidden">לוח הכפל 1–10</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.colHead}>
              ×
            </th>
            {TABLE_FACTORS.map((n) => (
              <th key={n} scope="col" className={styles.colHead}>
                {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={TABLE_FACTORS[i]}>
              <th scope="row" className={styles.rowHead}>
                {TABLE_FACTORS[i]}
              </th>
              {row.map((product, j) => (
                <td key={TABLE_FACTORS[j]}>{product}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
