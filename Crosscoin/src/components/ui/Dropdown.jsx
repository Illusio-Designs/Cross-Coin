import React, { useState, useRef, useEffect } from 'react';
import './Dropdown.css';

const Dropdown = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select an option',
  label,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`dropdown-wrapper ${className}`} ref={dropdownRef}>
      {label && <label className="dropdown-label">{label}</label>}
      
      <button
        className={`dropdown-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        type="button"
      >
        <span className="dropdown-value">{displayLabel}</span>
        <svg 
          className="dropdown-icon" 
          width="16" 
          height="16" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          viewBox="0 0 24 24"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {options.length === 0 ? (
            <div className="dropdown-empty">No options available</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                className={`dropdown-item ${value === option.value ? 'active' : ''}`}
                onClick={() => handleSelect(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
