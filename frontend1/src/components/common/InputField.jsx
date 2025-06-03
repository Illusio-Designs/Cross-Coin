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
  id
}) => {
  return (
    <div className={`input-field-container ${className}`}>
      {label && (
        <label htmlFor={id} className="input-field-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`input-field ${error ? 'error' : ''}`}
      />
      {error && <span className="input-field-error">{error}</span>}
    </div>
  );
};

export default InputField; 