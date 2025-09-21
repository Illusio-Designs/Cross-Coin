import React from 'react';
import '../../styles/common/Filter.css';

const Filter = ({ filters = [], selectedFilters = {}, onChange }) => {
  return (
    <div className="filter-container">
      {filters.map(filter => (
        <div key={filter.key} className="filter-item">
          <select
            value={selectedFilters[filter.key] || ''}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="filter-select"
          >
            <option value="">All {filter.label}</option>
            {filter.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};

export default Filter; 