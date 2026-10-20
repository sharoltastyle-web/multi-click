import { useId, type InputHTMLAttributes } from 'react';
import styles from './TextField.module.css';

export function TextField({
  label,
  id,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input id={inputId} type="text" className={styles.input} {...rest} />
    </div>
  );
}
