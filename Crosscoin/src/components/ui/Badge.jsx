import React from 'react';

const Badge = ({ children, variant = 'default', size = 'md', dot = false, className = '', ...props }) => {
  const cls = ['badge', `badge-${variant}`, `badge-${size}`, dot && 'badge-dot', className].filter(Boolean).join(' ');
  if (dot) return <span className={cls} {...props} />;
  return <span className={cls} {...props}>{children}</span>;
};

export default Badge;
