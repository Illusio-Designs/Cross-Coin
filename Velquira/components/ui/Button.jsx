'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';




/* Velquira buttons — quiet luxury. Espresso primary, hairline outline
   secondary, champagne accent, understated text ghost. Uppercase, wide
   tracking, generous padding, tasteful pill radius — no harsh corners,
   no heavy shadows. */
const variantClasses = {
  primary:
    'vq-grad-btn rounded-full px-9 py-4 focus-visible:ring-emerald',
  ink:
    'rounded-full px-9 py-4 bg-ink text-white hover:bg-[#3a3227] focus-visible:ring-ink',
  champagne:
    'rounded-full px-9 py-4 bg-gold text-white hover:bg-gold-deep focus-visible:ring-gold',
  secondary:
    'rounded-full px-9 py-4 border border-ink text-ink hover:bg-ink hover:text-white focus-visible:ring-ink',
  ghost:
    'text-ink underline underline-offset-[6px] decoration-gold/60 hover:text-gold focus-visible:ring-ink'
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