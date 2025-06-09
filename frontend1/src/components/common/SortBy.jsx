import React from 'react';

const SortBy = ({
  options,
  selectedValue,
  onChange,
  direction = 'asc',
  onDirectionChange,
  className = ''
}) => {
  return (
    <div className={`sort-by-container ${className}`}>
      <select
        className="sort-by-select"
        value={selectedValue}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Sort by
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        className={`sort-direction-button ${direction}`}
        onClick={() => onDirectionChange(direction === 'asc' ? 'desc' : 'asc')}
        title={`Sort ${direction === 'asc' ? 'descending' : 'ascending'}`}
      >
        {direction === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
};

export default SortBy; 