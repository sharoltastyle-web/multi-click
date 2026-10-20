import type { AnchorHTMLAttributes, ButtonHTMLAttributes, Ref } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary';

function classes(variant: Variant, extra?: string) {
  return [styles.button, styles[variant], extra].filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; ref?: Ref<HTMLButtonElement> }) {
  return <button type="button" className={classes(variant, className)} {...rest} />;
}

/** A link styled as a button, used for navigation actions. */
export function ButtonLink({
  variant = 'primary',
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a className={classes(variant, className)} {...rest} />;
}
