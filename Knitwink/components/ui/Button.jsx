'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';









const variantClasses = {
  primary: 'bg-sage text-white hover:bg-sage-dark focus-visible:ring-sage',
  secondary:
  'border border-brand-black text-brand-black hover:bg-gray-100 focus-visible:ring-sage',
  ghost: 'text-brand-black underline underline-offset-4 hover:text-sage focus-visible:ring-sage'
};

const Button = forwardRef(
  ({ variant = 'primary', fullWidth = false, asChild: _asChild, className, children, ...props }, ref) => {
    const isGhost = variant === 'ghost';
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center text-sm font-medium uppercase tracking-wider transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40',
          isGhost ? '' : 'rounded-full px-8 py-3.5',
          variantClasses[variant],
          fullWidth && 'w-full',
          className
        )}
        {...props}>
        
        {children}
      </button>);

  }
);

Button.displayName = 'Button';

export { Button };