import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { IoClose } from 'react-icons/io5';
import styles from './Modal.module.css';

const Modal = ({
  isOpen = false,
  onClose,
  title,
  children,
  size = 'md',
  className = '',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  maxHeight,
  centered = true,
  ...props
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Handle modal visibility with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Store the previously focused element
      previousActiveElement.current = document.activeElement;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent layout shift
      
      // Focus the modal after animation
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 100);
    } else {
      setIsVisible(false);
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Restore focus to previously active element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen && !isVisible) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handleCloseClick = () => {
    onClose?.();
  };

  const modalClasses = [
    styles.modal,
    styles[`modal--${size}`],
    centered && styles['modal--centered'],
    isVisible && styles['modal--visible'],
    className
  ].filter(Boolean).join(' ');

  const overlayClasses = [
    styles.overlay,
    isVisible && styles['overlay--visible']
  ].filter(Boolean).join(' ');

  const modalStyle = {
    ...(maxHeight && { maxHeight }),
  };

  const modalContent = (
    <div className={overlayClasses} onClick={handleOverlayClick}>
      <div 
        ref={modalRef}
        className={modalClasses}
        onClick={(e) => e.stopPropagation()}
        style={modalStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && (
              <h2 id="modal-title" className={styles.title}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button 
                onClick={handleCloseClick}
                className={styles.closeButton}
                aria-label="Close modal"
                type="button"
              >
                <IoClose size={20} />
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className={styles.body}>
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof window !== 'undefined'
    ? ReactDOM.createPortal(modalContent, document.body)
    : null;
};

export default Modal;