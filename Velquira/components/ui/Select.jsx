'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';







const Select = forwardRef(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label &&
        <label
          htmlFor={selectId}
          className="text-xs font-medium uppercase tracking-widest text-gray-800">
          
            {label}
          </label>
        }
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full appearance-none rounded-lg border border-gray-200 bg-cream px-4 py-3 text-sm text-gray-800 transition-colors duration-150',
            'focus:border-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage',
            error && 'border-error',
            className
          )}
          {...props}>
          
          {options.map((opt) =>
          <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )}
        </select>
        {error &&
        <p className="text-xs text-error" role="alert">
            {error}
          </p>
        }
      </div>);

  }
);

Select.displayName = 'Select';

export { Select };