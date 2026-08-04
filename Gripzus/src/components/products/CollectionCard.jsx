import Link from 'next/link';

/* Gripzus CollectionCard — editorial edition.
   A clean image frame on warm paper with a quiet index chip, and the caption
   set BELOW the image (name + "Explore" + count) — the same borderless,
   caption-below language as the product cards. Shared across the home grid,
   the collections index and anywhere else.
   Props:
     collection : { id, name, slug, image, count? }
     index      : 0-based position (rendered as 01, 02, …)
     ratio      : tailwind aspect class (default aspect-[3/4]) */

export default function CollectionCard({ collection = {}, index = 0, ratio = 'aspect-[3/4]', className = '' }) {
  const { name = 'Collection', slug, image, count } = collection;
  const href = `/products?collection=${encodeURIComponent(slug || (name || '').trim())}`;

  return (
    <Link href={href} className={`group block ${className}`}>
      <div className={`media-zoom relative ${ratio} overflow-hidden rounded-lg bg-paper-warm`}>
        {image
          ? <img src={image} alt={name} loading="lazy"
                 className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]" />
          : <div className="absolute inset-0 bg-paper-deep" />}

        {/* Index chip — quiet, legible on any image */}
        <span className="absolute top-3 left-3 z-10 inline-flex items-center rounded-full bg-paper/85 backdrop-blur-sm px-2.5 py-1 text-[10px] tracking-[0.16em] tabular-nums text-ink">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Caption below the frame */}
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="h-display text-ink leading-tight text-lg md:text-xl">{name}</h3>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.12em] uppercase text-ink-muted transition-colors group-hover:text-accent shrink-0">
          Explore
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </span>
      </div>
      {typeof count === 'number' && count > 0 && (
        <p className="mt-1 text-[11px] tabular-nums text-ink-muted">{count} pairs</p>
      )}
    </Link>
  );
}
