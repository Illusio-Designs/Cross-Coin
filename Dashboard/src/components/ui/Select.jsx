import React, { useState, useRef, useEffect, useId } from 'react';

const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const Select = ({
  options = [], value, onChange, placeholder = 'Select an option',
  multiple = false, searchable = false, disabled = false, error = false,
  size = 'md', className = '', label, required = false, helperText, clearable = false,
  id, ref,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const generatedId = useId();
  const triggerId = id || generatedId;
  const selectRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const close = () => { setIsOpen(false); setSearchTerm(''); };
  const closeAndFocus = () => { close(); triggerRef.current?.focus(); };

  const filteredOptions = searchable && searchTerm
    ? options.filter(o => String(o.label).toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : value;

  const getSelectedLabels = () => {
    if (multiple) {
      return options.filter(o => selectedValues.includes(o.value));
    }
    return options.find(o => o.value === value) || null;
  };

  const handleOptionSelect = (val) => {
    if (multiple) {
      const cur = Array.isArray(value) ? value : [];
      onChange?.(cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val]);
    } else {
      onChange?.(val);
      closeAndFocus();
    }
  };

  const removeChip = (e, val) => {
    e.stopPropagation();
    const cur = Array.isArray(value) ? value : [];
    onChange?.(cur.filter(v => v !== val));
    triggerRef.current?.focus();
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : null);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) searchInputRef.current.focus();
  }, [isOpen, searchable]);

  const hasValue = multiple ? selectedValues.length > 0 : value != null && value !== '';
  const selectedLabels = getSelectedLabels();

  const triggerCls = [
    'sel-trigger',
    `sel-${size}`,
    multiple && hasValue && 'sel-trigger-has-chips',
    error && 'sel-trigger-error',
    disabled && 'sel-trigger-disabled',
    isOpen && 'sel-trigger-open',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={['sel-container', disabled && 'sel-container-disabled'].filter(Boolean).join(' ')} ref={selectRef}
      onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close(); }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !isOpen) return;
        event.stopPropagation();
        closeAndFocus();
      }}>
      {label && (
        <label className="sel-label" htmlFor={triggerId}>
          {label}{required && <span className="sel-required">*</span>}
        </label>
      )}
      <div className="sel-wrapper">

        {/* ── Trigger ── */}
        <div className={triggerCls}>
          <button type="button" className="sel-toggle" id={triggerId}
            ref={(node) => {
              triggerRef.current = node;
              if (typeof ref === 'function') return ref(node);
              if (ref) ref.current = node;
            }}
            aria-expanded={isOpen && !disabled}
            aria-controls={isOpen && !disabled ? `${triggerId}-options` : undefined}
            aria-invalid={!!error || undefined}
            aria-describedby={error || helperText ? `${triggerId}-hint` : undefined}
            disabled={disabled}
            onClick={() => isOpen ? close() : setIsOpen(true)}>
            <span className="ds-sr-only">{multiple && hasValue
              ? `${placeholder}, ${selectedValues.length} selected`
              : selectedLabels?.label || placeholder}</span>
          </button>
          <div className="sel-trigger-inner">
            {multiple ? (
              selectedValues.length === 0 ? (
                <span className="sel-placeholder">{placeholder}</span>
              ) : (
                <div className="sel-chips">
                  {(Array.isArray(selectedLabels) ? selectedLabels : []).map(opt => (
                    <span key={opt.value} className="sel-chip">
                      {opt.label}
                      <button type="button" className="sel-chip-remove" aria-label={`Remove ${opt.label}`} disabled={disabled}
                        onClick={e => removeChip(e, opt.value)}>
                        <XIcon />
                      </button>
                    </span>
                  ))}
                </div>
              )
            ) : (
              <span className={hasValue ? 'sel-value' : 'sel-placeholder'}>
                {selectedLabels?.label || placeholder}
              </span>
            )}
          </div>
          <div className="sel-icons">
            {clearable && hasValue && !disabled && (
              <button type="button" className="sel-clear-btn" onClick={handleClearAll} aria-label="Clear">
                <XIcon />
              </button>
            )}
            <span className={['sel-chevron', isOpen && 'sel-chevron-open'].filter(Boolean).join(' ')}>
              <ChevronDown />
            </span>
          </div>
        </div>

        {/* ── Dropdown ── */}
        {isOpen && !disabled && (
          <div className="sel-dropdown" id={`${triggerId}-options`}>
            {searchable && (
              <div className="sel-search-wrap">
                <span className="sel-search-icon"><SearchIcon /></span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="sel-search-input"
                  aria-label="Search options"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            <div className="sel-options-list">
              {filteredOptions.length === 0 ? (
                <div className="sel-no-options">{searchTerm ? 'No results' : 'No options'}</div>
              ) : filteredOptions.map(opt => {
                const isSel = multiple
                  ? selectedValues.includes(opt.value)
                  : value === opt.value;
                return (
                  <button type="button"
                    key={opt.value}
                    className={['sel-option', isSel && 'sel-option-selected', opt.disabled && 'sel-option-disabled'].filter(Boolean).join(' ')}
                    disabled={opt.disabled}
                    aria-pressed={isSel}
                    onClick={() => handleOptionSelect(opt.value)}
                  >
                    {multiple && (
                      <span className={['sel-checkbox', isSel && 'sel-checkbox-checked'].filter(Boolean).join(' ')}>
                        {isSel && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <polyline points="1.5 6 4.5 9 10.5 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    )}
                    <span className="sel-option-label">{opt.label}</span>
                    {!multiple && isSel && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ds-color-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {multiple && (
              <div className="sel-footer">
                <span className="sel-count">{selectedValues.length} selected</span>
                <button type="button" className="sel-done-btn" onClick={closeAndFocus}>Done</button>
              </div>
            )}
          </div>
        )}
      </div>

      {(error || helperText) && (
        <div id={`${triggerId}-hint`} className={error ? 'sel-error-text' : 'sel-helper-text'}>{error || helperText}</div>
      )}
    </div>
  );
};

Select.displayName = 'Select';
export default Select;
