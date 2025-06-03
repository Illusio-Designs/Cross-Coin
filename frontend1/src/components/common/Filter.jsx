import React from 'react';
import '../../styles/common/Filter.css';

const Filter = ({
  options,
  selectedValue,
  onChange,
  placeholder = 'Select filter',
  className = ''
}) => {
  return (
    <div className={`filter-container ${className}`}>
      <select
        className="filter-select"
        value={selectedValue}
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
};

export default Filter; 