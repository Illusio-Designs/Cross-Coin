import React from 'react';
import '../../styles/common/Switch.css';

const Switch = ({ checked, onChange, label }) => (
  <label className="switch-root">
    <input
      type="checkbox"
      className="switch-input"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
    />
    <span className="switch-slider" />
    {label && <span className="switch-label">{label}</span>}
  </label>
);

export default Switch; 