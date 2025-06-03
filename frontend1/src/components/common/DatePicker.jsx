import React from 'react';
import DatePickerLib from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/common/DatePicker.css';

const DatePicker = ({
  selected,
  onChange,
  label,
  placeholder = 'Select date',
  error,
  disabled = false,
  required = false,
  className = '',
  name,
  id,
  minDate,
  maxDate,
  dateFormat = 'dd/MM/yyyy'
}) => {
  return (
    <div className={`datepicker-container ${className}`}>
      {label && (
        <label className="datepicker-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <DatePickerLib
        selected={selected}
        onChange={onChange}
        className={`datepicker-input ${error ? 'error' : ''}`}
        placeholderText={placeholder}
        disabled={disabled}
        required={required}
        name={name}
        id={id}
        minDate={minDate}
        maxDate={maxDate}
        dateFormat={dateFormat}
        wrapperClassName="datepicker-wrapper"
      />
      {error && <span className="datepicker-error">{error}</span>}
    </div>
  );
};

export default DatePicker; 