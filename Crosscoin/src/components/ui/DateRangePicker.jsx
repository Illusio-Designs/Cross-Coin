import React from 'react';

const CalendarIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const ClearIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/**
 * Reusable DateRangePicker for dashboard pages.
 *
 * @param {string}   startDate       - Start date value (YYYY-MM-DD)
 * @param {string}   endDate         - End date value (YYYY-MM-DD)
 * @param {function} onStartChange   - Called with new start date string
 * @param {function} onEndChange     - Called with new end date string
 * @param {function} [onClear]       - Called when clear button is clicked
 * @param {function} [onApply]       - If provided, shows an Apply button
 * @param {string}   [label]         - Optional label text (default: "Date Range")
 * @param {boolean}  [showIcon]      - Show calendar icon (default: true)
 * @param {boolean}  [inline]        - Compact inline mode (default: false)
 * @param {string}   [className]     - Additional class name
 */
const DateRangePicker = ({
  startDate = '',
  endDate = '',
  onStartChange,
  onEndChange,
  onClear,
  onApply,
  label = 'Date Range',
  showIcon = true,
  inline = false,
  className = '',
}) => {
  const hasValue = startDate || endDate;

  const handleSubmit = (e) => {
    e.preventDefault();
    onApply?.();
  };

  const Wrapper = onApply ? 'form' : 'div';
  const wrapperProps = onApply ? { onSubmit: handleSubmit } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={[
        'drp',
        inline && 'drp--inline',
        className,
      ].filter(Boolean).join(' ')}
    >
      {label && (
        <div className="drp-label">
          {showIcon && <CalendarIcon />}
          <span>{label}</span>
        </div>
      )}

      <div className="drp-inputs">
        <div className="drp-field">
          <label className="drp-field-label">From</label>
          <input
            type="date"
            className="drp-input"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => onStartChange(e.target.value)}
          />
        </div>
        <div className="drp-field">
          <label className="drp-field-label">To</label>
          <input
            type="date"
            className="drp-input"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onEndChange(e.target.value)}
          />
        </div>
      </div>

      <div className="drp-actions">
        {onApply && (
          <button type="submit" className="drp-apply-btn">
            Apply
          </button>
        )}
        {onClear && hasValue && (
          <button
            type="button"
            className="drp-clear-btn"
            onClick={onClear}
          >
            <ClearIcon />
            Clear
          </button>
        )}
      </div>
    </Wrapper>
  );
};

export default DateRangePicker;
