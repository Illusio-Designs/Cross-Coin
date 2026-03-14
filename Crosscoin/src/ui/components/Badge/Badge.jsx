import React from 'react';
import styles from './Badge.module.css';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const badgeClasses = [
    styles.badge,
    styles[`badge--${variant}`],
    styles[`badge--${size}`],
    dot && styles['badge--dot'],
    className
  ].filter(Boolean).join(' ');

  if (dot) {
    return <span className={badgeClasses} {...props} />;
  }

  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  );
};

export default Badge;