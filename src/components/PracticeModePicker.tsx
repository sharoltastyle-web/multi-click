import { useId } from 'react';
import { FACTOR_MAX, FACTOR_MIN, type PracticeMode } from '../domain/practice';
import styles from './PracticeModePicker.module.css';

const FACTORS = Array.from({ length: FACTOR_MAX - FACTOR_MIN + 1 }, (_, i) => FACTOR_MIN + i);

/** Practice type radios; the factor select is active only in selected-factor mode. */
export function PracticeModePicker({
  mode,
  selectedFactor,
  disabled,
  onModeChange,
  onFactorChange,
}: {
  mode: PracticeMode;
  selectedFactor: number;
  disabled: boolean;
  onModeChange: (mode: PracticeMode) => void;
  onFactorChange: (factor: number) => void;
}) {
  const ids = useId();
  return (
    <fieldset className={styles.picker} disabled={disabled}>
      <legend className="visually-hidden">סוג תרגול</legend>
      <label className={styles.option}>
        <input
          type="radio"
          name={`${ids}-mode`}
          className={styles.radio}
          checked={mode === 'random'}
          onChange={() => onModeChange('random')}
        />
        <span>תרגול אקראי</span>
      </label>
      <div className={styles.factorColumn}>
        <label className={styles.option}>
          <input
            type="radio"
            name={`${ids}-mode`}
            className={styles.radio}
            checked={mode === 'selectedFactor'}
            onChange={() => onModeChange('selectedFactor')}
          />
          <span>תרגול לפי כפולה</span>
        </label>
        <div className={styles.factorField}>
          <label htmlFor={`${ids}-factor`} className={styles.factorLabel}>
            כפולה
          </label>
          <select
            id={`${ids}-factor`}
            className={styles.select}
            value={selectedFactor}
            disabled={disabled || mode !== 'selectedFactor'}
            onChange={(e) => onFactorChange(Number(e.target.value))}
          >
            {FACTORS.map((factor) => (
              <option key={factor} value={factor}>
                {factor}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}
