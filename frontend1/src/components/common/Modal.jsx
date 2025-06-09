import React from 'react';
import Button from './Button';
import { IoClose } from 'react-icons/io5';
import '../../styles/common/Modal.css';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  className = '',
  showCloseButton = true,
  closeOnOverlayClick = true,
  footer,
  maxHeight = '90vh'
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div 
        className={`modal-content ${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight }}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          {showCloseButton && (
            <Button 
              onClick={onClose}
              className="modal-close-button"
              variant="ghost"
              aria-label="Close modal"
            >
              <IoClose size={24} />
            </Button>
          )}
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal; 