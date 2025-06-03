import React from 'react';
import '../../styles/common/Button.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  className = '',
  onClick,
  disabled = false,
  type = 'button'
}) => {
  return (
    <button
      type={type}
      className={`button ${variant} ${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button; 