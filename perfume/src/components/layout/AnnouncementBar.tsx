'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const announcements = [
  'Free shipping on orders over $50',
  'New arrivals: Winter Collection 2024',
  '20% off on your first order - Use code: FIRST20',
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
    <div className="bg-primary text-white py-2 px-4 text-center text-sm relative">
      <div className="container-custom flex items-center justify-center">
        <p className="animate-fade-in">{announcements[currentIndex]}</p>
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
