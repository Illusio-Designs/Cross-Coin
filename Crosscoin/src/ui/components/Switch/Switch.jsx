import React, { forwardRef } from 'react';
import styles from './Switch.module.css';

const Switch = forwardRef(({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  label,
  description,
  className = '',
  name,
  ...props
}, ref) => {
  const handleChange = (e) => {
    if (!disabled && onChange) {
      onChange(e.target.checked, e);
    }
  };

  const switchClasses = [
    styles.switch,
    styles[`switch--${size}`],
    checked && styles['switch--checked'],
    disabled && styles['switch--disabled'],
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    styles.container,
    disabled && styles['container--disabled']
  ].filter(Boolean).join(' ');

  return (
    <label className={containerClasses}>
      <div className={styles.switchWrapper}>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className={styles.input}
          name={name}
          {...props}
        />
        <div className={switchClasses}>
          <div className={styles.thumb} />
        </div>
      </div>
      
      {(label || description) && (
        <div className={styles.content}>
          {label && (
            <span className={styles.label}>
              {label}
            </span>
          )}
          {description && (
            <span className={styles.description}>
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
});

Switch.displayName = 'Switch';

export default Switch;