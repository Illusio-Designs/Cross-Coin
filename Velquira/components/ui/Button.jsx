'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';




/* Velquira buttons — quiet luxury. Espresso primary, hairline outline
   secondary, champagne accent, understated text ghost. Uppercase, wide
   tracking, generous padding, tasteful pill radius — no harsh corners,
   no heavy shadows. */
const variantClasses = {
  primary:
    'rounded-full px-9 py-4 bg-brand-black text-white hover:bg-[#3a3327] focus-visible:ring-sage',
  champagne:
    'rounded-full px-9 py-4 bg-sage text-white hover:bg-sage-dark focus-visible:ring-sage',
  secondary:
    'rounded-full px-9 py-4 border border-brand-black text-brand-black hover:bg-brand-black hover:text-white focus-visible:ring-sage',
  ghost:
    'text-brand-black underline underline-offset-[6px] decoration-sage/60 hover:text-sage focus-visible:ring-sage'
};

const Button = forwardRef(
  ({ variant = 'primary', fullWidth = false, asChild: _asChild, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center text-[11px] font-medium uppercase tracking-[0.22em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40',
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