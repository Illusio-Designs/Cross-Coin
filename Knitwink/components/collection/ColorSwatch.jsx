'use client';

import { cn } from '@/lib/utils';








export function ColorSwatch({ color, active, onSelect }) {
  return (
    <button
      role="radio"
      aria-label={color.name}
      aria-checked={active}
      onClick={() => onSelect(color)}
      className={cn(
        'h-4 w-4 rounded-full border border-gray-300 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-black',
        active && 'ring-2 ring-brand-black ring-offset-2',
        // extra border for very light colors so they're visible on white bg
        color.hex === '#ffffff' || color.hex === 'white' || color.hex === '#fffdd0' || color.hex === '#fffff0' || color.hex === '#ivory' ?
        'border-gray-400' :
        'border-gray-200'
      )}
      style={{ backgroundColor: color.hex }} />);


}