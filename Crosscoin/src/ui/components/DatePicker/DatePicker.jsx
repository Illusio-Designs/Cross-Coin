import React, { useState, forwardRef } from 'react';
import { FiCalendar } from 'react-icons/fi';
import styles from './DatePicker.module.css';

const DatePicker = forwardRef(({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  error = false,
  size = 'md',
  label,
  required = false,
  helperText,
  min,
  max,
  className = '',
  name,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);

  const containerClasses = [
    styles.container,
    disabled && styles['container--disabled']
  ].filter(Boolean).join(' ');

  const inputClasses = [
    styles.input,
    styles[`input--${size}`],
    error && styles['input--error'],
    disabled && styles['input--disabled'],
    focused && styles['input--focused'],
    className
  ].filter(Boolean).join(' ');

  const formatDateForInput = (date) => {
    if (!date) return '';
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date;
  };

  const handleChange = (e) => {
    const dateValue = e.target.value;
    if (onChange) {
      // Return Date object or string based on input
      const dateObj = dateValue ? new Date(dateValue) : null;
      onChange(dateObj, e);
    }
  };

  return (
    <div className={containerClasses}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      <div className={styles.inputWrapper}>
        <input
          ref={ref}
          type="date"
          value={formatDateForInput(value)}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          min={min}
          max={max}
          className={inputClasses}
          placeholder={placeholder}
          name={name}
          {...props}
        />
        <FiCalendar className={styles.icon} />
      </div>
      
      {(error || helperText) && (
        <div className={error ? styles.errorText : styles.helperText}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker;