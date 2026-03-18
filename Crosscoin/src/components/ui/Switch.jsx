import React, { forwardRef } from 'react';

const Switch = forwardRef(({
  checked = false, onChange, disabled = false, size = 'md',
  label, description, className = '', name, ...props
}, ref) => {
  const handleChange = (e) => { if (!disabled && onChange) onChange(e.target.checked, e); };

  const containerCls = ['sw-container', disabled && 'sw-container-disabled', className].filter(Boolean).join(' ');
  const trackCls = ['sw-track', `sw-${size}`, checked && 'sw-track-checked', disabled && 'sw-track-disabled'].filter(Boolean).join(' ');

  return (
    <label className={containerCls}>
      <div className="sw-wrapper">
        <input ref={ref} type="checkbox" checked={checked} onChange={handleChange}
          disabled={disabled} className="sw-input" name={name} {...props} />
        <div className={trackCls}>
          <div className="sw-thumb" />
        </div>
      </div>
      {(label || description) && (
        <div className="sw-content">
          {label && <span className="sw-label">{label}</span>}
          {description && <span className="sw-description">{description}</span>}
        </div>
      )}
    </label>
  );
});

Switch.displayName = 'Switch';
export default Switch;
