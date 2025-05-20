import React from 'react';

const Card = ({ 
  title, 
  subtitle, 
  children, 
  className = '', 
  headerAction,
  footer,
  variant = 'default',
  loading = false
}) => {
  return (
    <div className={`card ${variant} ${className} ${loading ? 'loading' : ''}`}>
      {(title || subtitle || headerAction) && (
        <div className="card-header">
          <div className="card-title-group">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {headerAction && <div className="card-header-action">{headerAction}</div>}
        </div>
      )}
      <div className="card-content">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};

export default Card; 