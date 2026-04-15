'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp } from 'lucide-react'

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!mounted) return null

  // Portal to body — above everything except cart drawer
  return createPortal(
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      style={{ zIndex: 2147483646 }}
      className={`fixed bottom-28 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-brand-black text-white shadow-lg transition-all duration-200 hover:bg-gray-800 ${
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <ArrowUp size={16} strokeWidth={2} />
    </button>,
    document.body
  )
}
