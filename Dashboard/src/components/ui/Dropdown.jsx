import React, { useState, useRef, useEffect, useId } from 'react';

const Dropdown = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select an option',
  label,
  ariaLabel,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const id = useId();

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

  // Compare as text: ids arrive as numbers in some places and strings in others.
  const same = (a, b) => a === b || (a != null && b != null && String(a) === String(b));
  const selectedOption = options.find(opt => same(opt.value, value));
  const displayLabel = selectedOption?.label || placeholder;

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`dropdown-wrapper ${className}${isOpen ? ' open' : ''}`} ref={dropdownRef}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !isOpen) return;
        event.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }}>
      {label && <label className="dropdown-label" htmlFor={id}>{label}</label>}
      
      <button
        id={id}
        ref={triggerRef}
        aria-label={ariaLabel ? `${ariaLabel}, ${displayLabel}` : undefined}
        aria-expanded={isOpen}
        aria-controls={isOpen ? `${id}-options` : undefined}
        className={`dropdown-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        type="button"
      >
        <span className="dropdown-value">{displayLabel}</span>
        <svg 
          className="dropdown-icon" 
          aria-hidden="true"
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
        <div className="dropdown-menu" id={`${id}-options`}>
          {options.length === 0 ? (
            <div className="dropdown-empty">No options available</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                className={`dropdown-item ${same(value, option.value) ? 'active' : ''}`}
                aria-pressed={same(value, option.value)}
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
