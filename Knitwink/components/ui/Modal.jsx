'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export function Modal({ open, onClose, title, children, className }) {
  const overlayRef = useRef(null);
  // Trap focus inside the panel while open; restore focus on close.
  const trapRef = useFocusTrap(open, { onEscape: onClose });

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === overlayRef.current && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}>
      <div
        ref={trapRef}
        className={cn(
          'relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8',
          className
        )}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-gray-600 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          aria-label="Close modal">
          <X size={20} />
        </button>
        {title && (
          <h2 className="mb-6 text-xl font-medium text-brand-black">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
