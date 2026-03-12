import React from 'react';
import '../../styles/ui/Button.css';

const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
  children,
  className = '',
  type = 'button',
  ...props
}) => {
  const buttonClass = `
    btn
    btn--${variant}
    btn--${size}
    ${fullWidth ? 'btn--full-width' : ''}
    ${disabled ? 'btn--disabled' : ''}
    ${loading ? 'btn--loading' : ''}
    ${className}
  `.trim();

  return (
    <button
      className={buttonClass}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading && <span className="btn__loader" />}
      {icon && iconPosition === 'left' && <span className="btn__icon">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="btn__icon">{icon}</span>}
    </button>
  );
};

export default Button;
