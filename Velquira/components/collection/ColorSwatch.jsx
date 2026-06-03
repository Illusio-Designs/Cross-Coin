'use client';

import { cn } from '@/lib/utils';




/* Velquira finish swatch — hairline-framed dot with a champagne selected
   ring. Used for metal / gemstone finish selection. */
export function ColorSwatch({ color, active, onSelect }) {
  return (
    <button
      role="radio"
      aria-label={color.name}
      aria-checked={active}
      onClick={() => onSelect(color)}
      className={cn(
        'h-4 w-4 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage',
        active && 'ring-2 ring-sage ring-offset-2',
        // extra border for very light finishes so they're visible on white bg
        color.hex === '#ffffff' || color.hex === 'white' || color.hex === '#fffdd0' || color.hex === '#fffff0' || color.hex === '#ivory' ?
        'border-gray-400' :
        'border-gray-300'
      )}
      style={{ backgroundColor: color.hex }} />);


}