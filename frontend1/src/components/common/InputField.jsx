import React from 'react';
import '../../styles/common/InputField.css';

const InputField = ({
  type = 'text',
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  className = '',
  name,
  id,
  accept // for file input
}) => {
  // Generate a unique id if not provided
  const inputId = id || `input-${name || Math.random().toString(36).substr(2, 9)}`;
  return (
    <div className={`input-field-container ${className}`}>
      {type === 'textarea' ? (
        <>
          <textarea
            id={inputId}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={" "}
            disabled={disabled}
            required={required}
            className={`input-field textarea ${error ? 'error' : ''}`}
            autoComplete="off"
            rows={4}
          />
          {label && (
            <label htmlFor={inputId} className="input-field-label">
              {label}
              {required && <span className="required-mark">*</span>}
            </label>
          )}
        </>
      ) : type === 'file' ? (
        <>
          <input
            type="file"
            id={inputId}
            name={name}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className={`input-field file ${error ? 'error' : ''}`}
            accept={accept}
          />
          {label && (
            <label htmlFor={inputId} className="input-field-label">
              {label}
              {required && <span className="required-mark">*</span>}
            </label>
          )}
        </>
      ) : (
        <>
          <input
            type={type}
            id={inputId}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={" "}
            disabled={disabled}
            required={required}
            className={`input-field ${error ? 'error' : ''}`}
            autoComplete="off"
          />
          {label && (
            <label htmlFor={inputId} className="input-field-label">
              {label}
              {required && <span className="required-mark">*</span>}
            </label>
          )}
        </>
      )}
      {error && <span className="input-field-error">{error}</span>}
    </div>
  );
};

export default InputField; 