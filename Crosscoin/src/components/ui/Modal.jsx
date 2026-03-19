import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

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

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      setTimeout(() => { if (modalRef.current) modalRef.current.focus(); }, 100);
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
      if (previousActiveElement.current) previousActiveElement.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleEscape = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen && !isVisible) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) onClose?.();
  };

  const overlayCls = ['modal-overlay', isVisible && 'modal-overlay-visible'].filter(Boolean).join(' ');
  const boxCls = [
    'modal-box',
    `modal-${size}`,
    centered && 'modal-box-centered',
    isVisible && 'modal-box-visible',
    className
  ].filter(Boolean).join(' ');

  const content = (
    <div className={overlayCls} onClick={handleOverlayClick}>
      <div ref={modalRef} className={boxCls} onClick={(e) => e.stopPropagation()}
        style={maxHeight ? { maxHeight } : undefined}
        role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined} tabIndex={-1} {...props}>
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h2 id="modal-title" className="modal-title">{title}</h2>}
            {showCloseButton && (
              <button onClick={() => onClose?.()} className="modal-close-btn" aria-label="Close modal" type="button">
                <CloseIcon />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? ReactDOM.createPortal(content, document.body) : null;
};

export default Modal;
