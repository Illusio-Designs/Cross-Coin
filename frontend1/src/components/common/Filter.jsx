import React from 'react';
import '../../styles/common/Filter.css';

const Filter = ({
  type = 'input',
  options = [],
  value,
  onChange,
  placeholder = 'Search...',
  className = ''
}) => {
  if (type === 'select') {
    return (
      <div className={`filter-container ${className}`}>
        <select
          className="filter-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`filter-container ${className}`}>
      <input
        type="text"
        className="filter-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
};

export default Filter; 