import React, { useState, useRef, useEffect, forwardRef } from 'react';

const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const Select = forwardRef(({
  options = [], value, onChange, placeholder = 'Select an option',
  multiple = false, searchable = false, disabled = false, error = false,
  size = 'md', className = '', label, required = false, helperText, clearable = false, ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredOptions = searchable && searchTerm
    ? options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const getSelectedDisplay = () => {
    if (!value) return placeholder;
    if (multiple) {
      if (Array.isArray(value) && value.length > 0) {
        const sel = options.filter(o => value.includes(o.value));
        return sel.length === 1 ? sel[0].label : `${sel.length} selected`;
      }
      return placeholder;
    }
    const sel = options.find(o => o.value === value);
    return sel ? sel.label : placeholder;
  };

  const handleOptionSelect = (val) => {
    if (multiple) {
      const cur = Array.isArray(value) ? value : [];
      onChange?.(cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val]);
    } else {
      onChange?.(val);
      setIsOpen(false);
    }
  };

  const handleClear = (e) => { e.stopPropagation(); onChange?.(multiple ? [] : null); };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) { setIsOpen(false); setSearchTerm(''); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) searchInputRef.current.focus();
  }, [isOpen, searchable]);

  const containerCls = ['sel-container', disabled && 'sel-container-disabled'].filter(Boolean).join(' ');
  const triggerCls = ['sel-trigger', `sel-${size}`, error && 'sel-trigger-error', disabled && 'sel-trigger-disabled', isOpen && 'sel-trigger-open', className].filter(Boolean).join(' ');
  const hasValue = multiple ? (Array.isArray(value) && value.length > 0) : value;

  return (
    <div className={containerCls} ref={selectRef}>
      {label && <label className="sel-label">{label}{required && <span className="sel-required">*</span>}</label>}
      <div className="sel-wrapper">
        <div className={triggerCls} onClick={() => !disabled && setIsOpen(!isOpen)} {...props}>
          <span className="sel-value">{getSelectedDisplay()}</span>
          <div className="sel-icons">
            {clearable && hasValue && !disabled && (
              <button type="button" className="sel-clear-btn" onClick={handleClear} aria-label="Clear selection">
                <XIcon />
              </button>
            )}
            <span className={['sel-chevron', isOpen && 'sel-chevron-open'].filter(Boolean).join(' ')}>
              <ChevronDown />
            </span>
          </div>
        </div>
        {isOpen && (
          <div className="sel-dropdown">
            {searchable && (
              <div className="sel-search-wrap">
                <input ref={searchInputRef} type="text" className="sel-search-input"
                  placeholder="Search options..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            )}
            <div className="sel-options-list">
              {filteredOptions.length === 0 ? (
                <div className="sel-no-options">{searchTerm ? 'No options found' : 'No options available'}</div>
              ) : filteredOptions.map((opt) => {
                const isSel = multiple ? Array.isArray(value) && value.includes(opt.value) : value === opt.value;
                return (
                  <div key={opt.value}
                    className={['sel-option', isSel && 'sel-option-selected', opt.disabled && 'sel-option-disabled'].filter(Boolean).join(' ')}
                    onClick={() => !opt.disabled && handleOptionSelect(opt.value)}>
                    <span className="sel-option-label">{opt.label}</span>
                    {multiple && isSel && <span className="sel-check-icon"><CheckIcon /></span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {(error || helperText) && <div className={error ? 'sel-error-text' : 'sel-helper-text'}>{error || helperText}</div>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
