import { cn } from '@/lib/utils';




/* Velquira badge — subtle champagne / espresso, small uppercase with
   fine letter-spacing. Hairline-framed, no fills that shout. */
const variantClasses = {
  New: 'bg-white/90 text-brand-black border border-sage/40',
  Sale: 'bg-brand-black text-white',
  Bestseller: 'bg-sage text-white'
};

export function Badge({ variant, className }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-3 py-1 text-[9px] font-medium uppercase tracking-[0.22em]',
        variantClasses[variant],
        className
      )}>

      {variant}
    </span>);

}