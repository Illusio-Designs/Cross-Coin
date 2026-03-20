'use client'

import { useEffect, useRef, useState } from 'react'

interface Options extends IntersectionObserverInit {
  freezeOnceVisible?: boolean
}

export function useIntersectionObserver(options: Options = {}) {
  const { threshold = 0, root = null, rootMargin = '0%', freezeOnceVisible = false } = options
  const ref = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting
        setIsVisible(visible)
        if (visible && freezeOnceVisible) observer.disconnect()
      },
      { threshold, root, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, root, rootMargin, freezeOnceVisible])

  return { ref, isVisible }
}
