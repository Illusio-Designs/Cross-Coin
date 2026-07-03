import { cn } from '@/lib/utils'

const VARIANTS = {
  editorial: 'bg-ivory vq-lattice',
  obsidian: 'bg-brand-black text-white',
  split: 'bg-ivory vq-lattice',
  minimal: 'bg-[#faf5eb] border-b border-gold/15',
  cream: 'bg-cream vq-lattice',
}

export function PageHero({
  variant = 'editorial',
  eyebrow,
  title,
  titleAccent,
  description,
  children,
  className,
  align = 'center',
}) {
  const isDark = variant === 'obsidian'
  const isMinimal = variant === 'minimal'

  return (
    <header
      className={cn(
        'relative overflow-hidden',
        VARIANTS[variant] || VARIANTS.editorial,
        isMinimal ? 'py-14 md:py-16' : 'pt-20 pb-16 md:pt-28 md:pb-22',
        className
      )}
    >
      {isDark && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(191,139,46,0.16),transparent)]" />
          <div aria-hidden className="vq-nav-rule-bottom opacity-40" />
        </>
      )}

      {!isDark && !isMinimal && (
        <div aria-hidden className="vq-nav-rule-bottom opacity-30" />
      )}

      <div
        className={cn(
          'relative mx-auto max-w-[1480px] px-6 md:px-12 lg:px-16',
          align === 'center' && 'text-center',
          align === 'left' && 'text-left'
        )}
      >
        {eyebrow && <p className="vq-eyebrow">{eyebrow}</p>}

        {title && (
          <h1
            className={cn(
              'vq-display mt-5 max-w-4xl',
              align === 'center' && 'mx-auto',
              isMinimal ? 'text-3xl md:text-[2.5rem]' : 'text-[2.5rem] md:text-6xl lg:text-[4rem]',
              isDark ? 'text-white' : 'text-brand-black'
            )}
          >
            {title}
            {titleAccent && (
              <span className={cn('mt-2 block font-display italic', isDark ? 'text-gold-light' : 'text-gold')}>
                {titleAccent}
              </span>
            )}
          </h1>
        )}

        {description && (
          <p
            className={cn(
              'mt-6 max-w-xl font-display text-base italic leading-relaxed md:text-lg',
              align === 'center' && 'mx-auto',
              isDark ? 'text-white/60' : 'text-brand-black/55'
            )}
          >
            {description}
          </p>
        )}

        {(description || title) && !isMinimal && (
          <span
            aria-hidden
            className={cn('vq-section-rule mt-8', align === 'center' && 'mx-auto')}
          />
        )}

        {children}
      </div>
    </header>
  )
}
