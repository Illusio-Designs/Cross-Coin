import React from 'react';

/**
 * Button — the admin's buttons.
 *
 *   variant: 'primary'   one main action per page
 *            'secondary' everything else
 *            'danger'    destructive (ask on the page first — ConfirmBar)
 *            'quiet'     a link-like action
 *   loading: shows a spinner and `loadingText` (e.g. "Saving…"), disabled.
 *
 * Older variant names still work: outline/ghost → secondary look,
 * success → primary look.
 */
const VARIANTS = { primary: 'primary', secondary: 'secondary', danger: 'danger', quiet: 'quiet', outline: 'secondary', ghost: 'secondary', success: 'primary' };

const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  loadingText = null,
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
    `btn-${VARIANTS[variant] || 'primary'}`,
    `btn-${size}`,
    fullWidth && 'btn-full-width',
    loading && 'btn-loading',
    className,
  ].filter(Boolean).join(' ');

  // Icon-only buttons need a name for screen readers.
  const label = ariaLabel || (icon && !children ? (title || 'Button') : null);

  return (
    <button
      className={cls}
      disabled={disabled || loading}
      type={type}
      aria-label={label || undefined}
      aria-busy={loading || undefined}
      aria-describedby={ariaDescribedBy || undefined}
      title={title || undefined}
      {...props}
    >
      {loading && <span className="btn-loader" aria-hidden="true" />}
      {!loading && icon && iconPosition === 'left' && <span className="btn-icon" aria-hidden="true">{icon}</span>}
      {loading && loadingText ? loadingText : children}
      {!loading && icon && iconPosition === 'right' && <span className="btn-icon" aria-hidden="true">{icon}</span>}
    </button>
  );
};

export default Button;
