import { inlineHtml } from '@/lib/sanitizeHtml';

/**
 * Shared section header — consistent across all home sections.
 * eyebrow: small uppercase label above
 * title: main heading (can include <strong>/<em> for emphasis;
 *        anything else gets stripped by inlineHtml)
 * center: boolean — centered or left-aligned
 */
export function SectionHeader({ eyebrow, title, center = false }) {
  return (
    <div className={`mb-8 ${center ? 'text-center' : ''}`}>
      {eyebrow && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">{eyebrow}</p>
      )}
      <h2
        className="mt-1.5 font-display text-2xl font-normal text-brand-black lg:text-3xl"
        {...inlineHtml(title)}
      />
    </div>
  );
}
