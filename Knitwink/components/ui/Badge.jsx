import { cn } from '@/lib/utils';








const variantClasses = {
  New: 'bg-white/90 text-brand-black',
  Sale: 'bg-earth text-white',
  Bestseller: 'bg-sage text-white'
};

export function Badge({ variant, className }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-widest',
        variantClasses[variant],
        className
      )}>
      
      {variant}
    </span>);

}