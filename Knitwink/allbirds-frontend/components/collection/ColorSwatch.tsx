'use client'

import { cn } from '@/lib/utils'
import type { ProductColor } from '@/types'

interface ColorSwatchProps {
  color: ProductColor
  active: boolean
  onSelect: (color: ProductColor) => void
}

export function ColorSwatch({ color, active, onSelect }: ColorSwatchProps) {
  return (
    <button
      role="radio"
      aria-label={color.name}
      aria-checked={active}
      onClick={() => onSelect(color)}
      className={cn(
        'h-4 w-4 rounded-full border border-gray-200 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage',
        active && 'ring-2 ring-brand-black ring-offset-2'
      )}
      style={{ backgroundColor: color.hex }}
    />
  )
}
