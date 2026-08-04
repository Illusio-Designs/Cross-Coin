import React, { useState, forwardRef } from 'react';

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
  ariaLabel = null,
  ariaDescribedBy = null,
  ...props
}, ref) => {
  // Generate IDs for accessibility
  const fieldId = name || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${fieldId}-error` : null;
  const helperId = helperText ? `${fieldId}-helper` : null;
  const describedById = [ariaDescribedBy, errorId, helperId].filter(Boolean).join(' ') || undefined;
  const fieldCls = [
    'input-field',
    `input-${size}`,
    variant !== 'default' && `input-${variant}`,
    error && 'input-error',
    disabled && 'input-disabled',
    leftIcon && 'input-with-left-icon',
    rightIcon && 'input-with-right-icon',
    className
  ].filter(Boolean).join(' ');

  const containerCls = ['input-container', disabled && 'input-container-disabled'].filter(Boolean).join(' ');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    onChange?.(e);
  };

  if (type === 'file') {
    return (
      <div className={containerCls}>
        {label && <label className="input-label" htmlFor={fieldId}>{label}{required && <span className="input-required" aria-label="required">*</span>}</label>}
        <div className="input-file-container">
          <div className="input-file-wrapper">
            <input
              ref={ref}
              id={fieldId}
              type="file"
              onChange={handleFileChange}
              accept={accept}
              required={required}
              className="input-file-input"
              name={name}
              disabled={disabled}
              aria-label={ariaLabel || label}
              aria-invalid={!!error}
              aria-describedby={describedById}
              aria-required={required}
              multiple
              {...props}
            />
            <div className="input-file-placeholder" aria-live="polite">
              {Array.isArray(value) && value.length > 0
                ? value.map((f, i) => f.name || (f.url && f.url.split('/').pop()) || `File ${i + 1}`).join(', ')
                : (value && value.name) || placeholder || 'Choose a file'}
            </div>
            <button type="button" className="input-file-button" disabled={disabled} aria-label="Browse files">Browse</button>
          </div>
          {Array.isArray(value) && value.length > 0 && (
            <div className="input-file-preview-grid" role="region" aria-label="File previews">
              {value.map((f, i) => (
                <img
                  key={i}
                  src={f instanceof File ? URL.createObjectURL(f) : (f.url || f)}
                  alt={`Preview of ${f.name || f.url?.split('/').pop() || 'file'}`}
                  className="input-file-preview-image"
                />
              ))}
            </div>
          )}
        </div>
        {error && <div id={errorId} className="input-error-text" role="alert">{error}</div>}
        {helperText && <div id={helperId} className="input-helper-text">{helperText}</div>}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className={containerCls}>
        {label && <label className="input-label" htmlFor={fieldId}>{label}{required && <span className="input-required" aria-label="required">*</span>}</label>}
        <div className="input-wrapper">
          {leftIcon && <span className="input-left-icon" aria-hidden="true">{leftIcon}</span>}
          <select
            ref={ref}
            id={fieldId}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className={fieldCls}
            name={name}
            aria-label={ariaLabel || label}
            aria-invalid={!!error}
            aria-describedby={describedById}
            aria-required={required}
            {...props}
          >
            {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {rightIcon && <span className="input-right-icon" aria-hidden="true">{rightIcon}</span>}
        </div>
        {error && <div id={errorId} className="input-error-text" role="alert">{error}</div>}
        {helperText && <div id={helperId} className="input-helper-text">{helperText}</div>}
      </div>
    );
  }

  if (multiline) {
    return (
      <div className={containerCls}>
        {label && <label className="input-label" htmlFor={fieldId}>{label}{required && <span className="input-required" aria-label="required">*</span>}</label>}
        <div className="input-wrapper">
          <textarea
            ref={ref}
            id={fieldId}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={fieldCls}
            rows={rows}
            name={name}
            aria-label={ariaLabel || label}
            aria-invalid={!!error}
            aria-describedby={describedById}
            aria-required={required}
            {...props}
          />
        </div>
        {error && <div id={errorId} className="input-error-text" role="alert">{error}</div>}
        {helperText && <div id={helperId} className="input-helper-text">{helperText}</div>}
      </div>
    );
  }

  return (
    <div className={containerCls}>
      {label && <label className="input-label" htmlFor={fieldId}>{label}{required && <span className="input-required" aria-label="required">*</span>}</label>}
      <div className="input-wrapper">
        {leftIcon && <span className="input-left-icon" aria-hidden="true">{leftIcon}</span>}
        <input
          ref={ref}
          id={fieldId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={fieldCls}
          name={name}
          aria-label={ariaLabel || label}
          aria-invalid={!!error}
          aria-describedby={describedById}
          aria-required={required}
          {...props}
        />
        {rightIcon && <span className="input-right-icon" aria-hidden="true">{rightIcon}</span>}
      </div>
      {error && <div id={errorId} className="input-error-text" role="alert">{error}</div>}
      {helperText && <div id={helperId} className="input-helper-text">{helperText}</div>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
