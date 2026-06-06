import { inlineHtml } from '@/lib/sanitizeHtml'

/**
 * Velquira section header — editorial, premium jewellery.
 * eyebrow: small uppercase champagne label above
 * title: large serif heading (can include <strong> for emphasis)
 * center: boolean — centered or left-aligned
 * rule: boolean — optional thin champagne rule under the title
 *
 * Title is admin-authorable; sanitised via inlineHtml (formatting
 * tags only — no block elements, no anchors, no images).
 */
export function SectionHeader({ eyebrow, title, center = false, rule = false }) {
  return (
    <div className={`mb-10 ${center ? 'text-center' : ''}`}>
      {eyebrow && (
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-sage">{eyebrow}</p>
      )}
      <h2
        className="mt-3 font-display text-3xl font-normal leading-tight text-brand-black lg:text-4xl"
        {...inlineHtml(title)}
      />
      {rule && (
        <div className={`mt-5 h-px w-16 bg-sage/50 ${center ? 'mx-auto' : ''}`} />
      )}
    </div>
  )
}