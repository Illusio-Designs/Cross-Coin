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
  ...props
}, ref) => {
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
        {label && <label className="input-label">{label}{required && <span className="input-required">*</span>}</label>}
        <div className="input-file-container">
          <div className="input-file-wrapper">
            <input ref={ref} type="file" onChange={handleFileChange} accept={accept} required={required}
              className="input-file-input" name={name} disabled={disabled} multiple {...props} />
            <div className="input-file-placeholder">
              {Array.isArray(value) && value.length > 0
                ? value.map((f, i) => f.name || (f.url && f.url.split('/').pop()) || `File ${i + 1}`).join(', ')
                : (value && value.name) || placeholder || 'Choose a file'}
            </div>
            <button type="button" className="input-file-button" disabled={disabled}>Browse</button>
          </div>
          {Array.isArray(value) && value.length > 0 && (
            <div className="input-file-preview-grid">
              {value.map((f, i) => (
                <img key={i} src={f instanceof File ? URL.createObjectURL(f) : (f.url || f)}
                  alt={`Preview ${i + 1}`} className="input-file-preview-image" />
              ))}
            </div>
          )}
        </div>
        {(error || helperText) && <div className={error ? 'input-error-text' : 'input-helper-text'}>{error || helperText}</div>}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className={containerCls}>
        {label && <label className="input-label">{label}{required && <span className="input-required">*</span>}</label>}
        <div className="input-wrapper">
          {leftIcon && <span className="input-left-icon">{leftIcon}</span>}
          <select ref={ref} value={value} onChange={onChange} required={required} disabled={disabled}
            className={fieldCls} name={name} {...props}>
            {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {rightIcon && <span className="input-right-icon">{rightIcon}</span>}
        </div>
        {(error || helperText) && <div className={error ? 'input-error-text' : 'input-helper-text'}>{error || helperText}</div>}
      </div>
    );
  }

  if (multiline) {
    return (
      <div className={containerCls}>
        {label && <label className="input-label">{label}{required && <span className="input-required">*</span>}</label>}
        <div className="input-wrapper">
          <textarea ref={ref} value={value} onChange={onChange} placeholder={placeholder} required={required}
            disabled={disabled} className={fieldCls} rows={rows} name={name} {...props} />
        </div>
        {(error || helperText) && <div className={error ? 'input-error-text' : 'input-helper-text'}>{error || helperText}</div>}
      </div>
    );
  }

  return (
    <div className={containerCls}>
      {label && <label className="input-label">{label}{required && <span className="input-required">*</span>}</label>}
      <div className="input-wrapper">
        {leftIcon && <span className="input-left-icon">{leftIcon}</span>}
        <input ref={ref} type={type} value={value} onChange={onChange} placeholder={placeholder}
          required={required} disabled={disabled} className={fieldCls} name={name} {...props} />
        {rightIcon && <span className="input-right-icon">{rightIcon}</span>}
      </div>
      {(error || helperText) && <div className={error ? 'input-error-text' : 'input-helper-text'}>{error || helperText}</div>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
