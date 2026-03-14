import React, { useState, forwardRef } from 'react';
import styles from './Input.module.css';

const Input = forwardRef(({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  size = 'md',
  variant = 'default',
  disabled = false,
  required = false,
  error = false,
  helperText,
  leftIcon,
  rightIcon,
  multiline = false,
  rows = 4,
  accept,
  className = '',
  name,
  options = [],
  ...props
}, ref) => {
  const [preview, setPreview] = useState(null);

  const inputClasses = [
    styles.input,
    styles[`input--${size}`],
    styles[`input--${variant}`],
    error && styles['input--error'],
    disabled && styles['input--disabled'],
    leftIcon && styles['input--with-left-icon'],
    rightIcon && styles['input--with-right-icon'],
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    styles.container,
    disabled && styles['container--disabled']
  ].filter(Boolean).join(' ');

  // File input handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
    onChange?.(e);
  };

  // File input component
  if (type === 'file') {
    return (
      <div className={containerClasses}>
        {label && (
          <label className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}
        <div className={styles.fileContainer}>
          <div className={styles.fileWrapper}>
            <input
              ref={ref}
              type="file"
              onChange={handleFileChange}
              accept={accept}
              required={required}
              className={styles.fileInput}
              name={name}
              disabled={disabled}
              multiple
              {...props}
            />
            <div className={styles.filePlaceholder}>
              {Array.isArray(value) && value.length > 0
                ? value.map((file, idx) => 
                    file.name || (file.url && file.url.split('/').pop()) || `File ${idx + 1}`
                  ).join(', ')
                : (value && value.name) || placeholder || "Choose a file"}
            </div>
            <button type="button" className={styles.fileButton} disabled={disabled}>
              Browse
            </button>
          </div>
          {Array.isArray(value) && value.length > 0 && (
            <div className={styles.filePreviewGrid}>
              {value.map((file, idx) => (
                <img
                  key={idx}
                  src={file instanceof File ? URL.createObjectURL(file) : (file.url || file)}
                  alt={`Preview ${idx + 1}`}
                  className={styles.filePreviewImage}
                />
              ))}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <div className={error ? styles.errorText : styles.helperText}>
            {error || helperText}
          </div>
        )}
      </div>
    );
  }

  // Select input component
  if (type === 'select') {
    return (
      <div className={containerClasses}>
        {label && (
          <label className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}
        <div className={styles.inputWrapper}>
          {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
          <select
            ref={ref}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className={inputClasses}
            name={name}
            {...props}
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
        </div>
        {(error || helperText) && (
          <div className={error ? styles.errorText : styles.helperText}>
            {error || helperText}
          </div>
        )}
      </div>
    );
  }

  // Textarea component
  if (multiline) {
    return (
      <div className={containerClasses}>
        {label && (
          <label className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}
        <div className={styles.inputWrapper}>
          <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={inputClasses}
            rows={rows}
            name={name}
            {...props}
          />
        </div>
        {(error || helperText) && (
          <div className={error ? styles.errorText : styles.helperText}>
            {error || helperText}
          </div>
        )}
      </div>
    );
  }

  // Regular input component
  return (
    <div className={containerClasses}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.inputWrapper}>
        {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={inputClasses}
          name={name}
          {...props}
        />
        {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
      </div>
      {(error || helperText) && (
        <div className={error ? styles.errorText : styles.helperText}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;