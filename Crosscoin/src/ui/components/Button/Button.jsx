import React from 'react';
import styles from './Button.module.css';

const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
  children,
  className = '',
  type = 'button',
  ...props
}) => {
  const buttonClasses = [
    styles.btn,
    styles[`btn--${variant}`],
    styles[`btn--${size}`],
    fullWidth && styles['btn--full-width'],
    disabled && styles['btn--disabled'],
    loading && styles['btn--loading'],
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading && <span className={styles.btn__loader} />}
      {icon && iconPosition === 'left' && <span className={styles.btn__icon}>{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className={styles.btn__icon}>{icon}</span>}
    </button>
  );
};

export default Button;
