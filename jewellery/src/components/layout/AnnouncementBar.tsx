'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const announcements = [
  '✨ Free Shipping on Orders Over $500',
  '💎 New Collection: Timeless Elegance',
  '🎁 Complimentary Gift Wrapping on All Orders',
]

export default function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  if (!isVisible) return null

  return (
    <div className="bg-primary text-gold py-2 px-4 text-center text-sm relative">
      <div className="container-custom flex items-center justify-center">
        <p className="animate-fade-in font-medium">{announcements[currentIndex]}</p>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 hover:opacity-70 transition-opacity"
          aria-label="Close announcement"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
