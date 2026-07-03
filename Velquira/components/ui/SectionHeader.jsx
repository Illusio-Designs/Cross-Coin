import { inlineHtml } from '@/lib/sanitizeHtml'
import { cn } from '@/lib/utils'

/**
 * SectionHeader — editorial jewellery section titles.
 * Supports eyebrow, serif display title, optional gold rule.
 */
export function SectionHeader({ eyebrow, title, center = false, rule = false, dark = false, className }) {
  return (
    <div className={cn('mb-10', center && 'text-center', className)}>
      {eyebrow && (
        <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-gold">{eyebrow}</p>
      )}
      <h2
        className={cn(
          'vq-display mt-4 text-3xl md:text-4xl lg:text-[2.75rem]',
          dark ? 'text-white' : 'text-brand-black'
        )}
        {...inlineHtml(title)}
      />
      {rule && (
        <div
          className={cn(
            'mt-6 h-px w-16 bg-gradient-to-r from-gold/70 to-transparent',
            center && 'mx-auto'
          )}
        />
      )}
    </div>
  )
}
