import Link from 'next/link';

/* Shared numbered section header — the GROUND INDEX motif. A full-width top
   hairline, a large index numeral, an eyebrow + Space Grotesk title, and an
   optional underlined link on the right. Gives every home section the same
   architectural, catalogue-like rhythm. */

export default function SectionHead({ index, eyebrow, title, linkHref, linkLabel }) {
  return (
    <div className="border-t border-line pt-6 md:pt-8 mb-8 md:mb-12">
      <div className="flex items-end justify-between gap-6">
        <div className="flex items-start gap-4 md:gap-6">
          {index != null && (
            <span className="h-display text-ink-muted text-2xl md:text-3xl leading-none tabular-nums select-none">
              {String(index).padStart(2, '0')}
            </span>
          )}
          <div>
            {eyebrow && <p className="eyebrow text-ink-muted mb-2">{eyebrow}</p>}
            <h2 className="h-display text-2xl md:text-4xl text-ink leading-none">{title}</h2>
          </div>
        </div>
        {linkHref && linkLabel && (
          <Link href={linkHref} className="link-line shrink-0 whitespace-nowrap">{linkLabel}</Link>
        )}
      </div>
    </div>
  );
}
