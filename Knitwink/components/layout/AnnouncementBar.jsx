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
      <div className="flex h-8 items-center justify-center px-3">
        {/* One line on every width — the fixed h-8 + overflow-hidden clipped
            the wrapped second line on phones. Slightly smaller + nowrap on
            mobile so the full message fits; shorter separators on small. */}
        <p className="whitespace-nowrap text-center text-[10px] text-white sm:text-xs">
          Free Shipping over ₹599
          <span className="mx-1.5 sm:mx-2">·</span>Easy Returns
          <span className="mx-1.5 sm:mx-2">·</span>100% Authentic
        </p>
      </div>
    </div>
  )
}
