'use client'

import { useState, useEffect } from 'react'

export function AnnouncementBar() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`w-full overflow-hidden bg-brand-black transition-all duration-300 ${hidden ? 'h-0 opacity-0' : 'h-8 opacity-100'}`}
    >
      <div className="flex h-8 items-center justify-center px-4">
        <p className="text-center text-xs text-white">
          Free Shipping on Orders over ₹599 &nbsp;·&nbsp; Easy Returns &nbsp;·&nbsp; 100% Authentic
        </p>
      </div>
    </div>
  )
}
