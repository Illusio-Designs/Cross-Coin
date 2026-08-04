import React from 'react';

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
  ariaLabel = null,
  ariaDescribedBy = null,
  title = null,
  ...props
}) => {
  const cls = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-full-width',
    disabled && 'btn-disabled',
    loading && 'btn-loading',
    className
  ].filter(Boolean).join(' ');

  // For icon-only buttons, aria-label is required
  const needsAriaLabel = icon && !children;
  const finalAriaLabel = ariaLabel || (needsAriaLabel ? 'Button' : null);

  return (
    <button
      className={cls}
      disabled={disabled || loading}
      type={type}
      aria-label={finalAriaLabel}
      aria-busy={loading}
      aria-disabled={disabled}
      aria-describedby={ariaDescribedBy}
      title={title || finalAriaLabel}
      {...props}
    >
      {loading && <span className="btn-loader" aria-hidden="true" />}
      {icon && iconPosition === 'left' && <span className="btn-icon" aria-hidden="true">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="btn-icon" aria-hidden="true">{icon}</span>}
    </button>
  );
};

export default Button;
