'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';










export function Drawer({ open, onClose, title, children, side = 'right', className }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open &&
      <>
          <motion.div
          className="fixed inset-0 z-40 bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          aria-hidden="true" />
        
          <motion.div
          className={cn(
            'fixed top-0 z-50 flex h-full w-full max-w-md flex-col bg-white',
            side === 'right' ? 'right-0' : 'left-0',
            className
          )}
          initial={{ x: side === 'right' ? '100%' : '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: side === 'right' ? '100%' : '-100%' }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label={title}>
          
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              {title &&
            <h2 className="text-sm font-medium uppercase tracking-wider text-brand-black">
                  {title}
                </h2>
            }
              <button
              onClick={onClose}
              className="ml-auto p-1 text-gray-600 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
              aria-label="Close">
              
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}