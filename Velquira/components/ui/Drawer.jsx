'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'

export function Drawer({ open, onClose, title, children, side = 'right', className }) {
  // Trap focus inside the drawer panel while open; restores focus to
  // the element that opened the drawer on close.
  const trapRef = useFocusTrap(open, { onEscape: onClose })

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/40"
            style={{ zIndex: 2147483646 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={trapRef}
            className={cn(
              'fixed top-0 flex h-full w-full max-w-md flex-col bg-cream',
              side === 'right' ? 'right-0' : 'left-0',
              className
            )}
            style={{ zIndex: 2147483647 }}
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              {title && (
                <h2 className="text-sm font-medium uppercase tracking-wider text-brand-black">{title}</h2>
              )}
              <button
                onClick={onClose}
                className="ml-auto p-1 text-gray-600 hover:text-brand-black"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
