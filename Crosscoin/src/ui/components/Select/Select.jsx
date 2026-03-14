import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { FiChevronDown, FiCheck, FiX } from 'react-icons/fi';
import styles from './Select.module.css';

const Select = forwardRef(({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  multiple = false,
  searchable = false,
  disabled = false,
  error = false,
  size = 'md',
  className = '',
  label,
  required = false,
  helperText,
  clearable = false,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Get selected option(s) for display
  const getSelectedDisplay = () => {
    if (!value) return placeholder;
    
    if (multiple) {
      if (Array.isArray(value) && value.length > 0) {
        const selectedOptions = options.filter(opt => value.includes(opt.value));
        return selectedOptions.length === 1 
          ? selectedOptions[0].label
          : `${selectedOptions.length} selected`;
      }
      return placeholder;
    }
    
    const selectedOption = options.find(opt => opt.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  // Handle option selection
  const handleOptionSelect = (optionValue) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange?.(newValues);
    } else {
      onChange?.(optionValue);
      setIsOpen(false);
    }
  };

  // Handle clear
  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const containerClasses = [
    styles.container,
    disabled && styles['container--disabled']
  ].filter(Boolean).join(' ');

  const selectClasses = [
    styles.select,
    styles[`select--${size}`],
    error && styles['select--error'],
    disabled && styles['select--disabled'],
    isOpen && styles['select--open'],
    className
  ].filter(Boolean).join(' ');

  const hasValue = multiple ? (Array.isArray(value) && value.length > 0) : value;

  return (
    <div className={containerClasses} ref={selectRef}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      <div className={styles.selectWrapper}>
        <div
          className={selectClasses}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          {...props}
        >
          <span className={styles.selectedValue}>
            {getSelectedDisplay()}
          </span>
          
          <div className={styles.icons}>
            {clearable && hasValue && !disabled && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={handleClear}
                aria-label="Clear selection"
              >
                <FiX size={16} />
              </button>
            )}
            <FiChevronDown 
              className={[
                styles.chevron,
                isOpen ? styles.chevronOpen : ''
              ].join(' ')}
            />
          </div>
        </div>

        {isOpen && (
          <div className={styles.dropdown}>
            {searchable && (
              <div className={styles.searchWrapper}>
                <input
                  ref={searchInputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
            
            <div className={styles.optionsList}>
              {filteredOptions.length === 0 ? (
                <div className={styles.noOptions}>
                  {searchTerm ? 'No options found' : 'No options available'}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = multiple
                    ? Array.isArray(value) && value.includes(option.value)
                    : value === option.value;

                  return (
                    <div
                      key={option.value}
                      className={[
                        styles.option,
                        isSelected ? styles.optionSelected : '',
                        option.disabled ? styles.optionDisabled : ''
                      ].filter(Boolean).join(' ')}
                      onClick={() => !option.disabled && handleOptionSelect(option.value)}
                    >
                      <span className={styles.optionLabel}>
                        {option.label}
                      </span>
                      {multiple && isSelected && (
                        <FiCheck className={styles.checkIcon} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {(error || helperText) && (
        <div className={error ? styles.errorText : styles.helperText}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;