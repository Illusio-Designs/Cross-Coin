import Link from 'next/link';

/* Gripzus CollectionCard — GROUND INDEX architectural edition.
   A 1px-framed image (square corners, no shadow) with a solid black square
   index tab, and the caption set BELOW the frame (name + "Explore" + count),
   matching the product cards. Shared across the home grid, the collections
   index and anywhere else.
   Props:
     collection : { id, name, slug, image, count? }
     index      : 0-based position (rendered as 01, 02, …)
     ratio      : tailwind aspect class (default aspect-[3/4]) */

export default function CollectionCard({ collection = {}, index = 0, ratio = 'aspect-[3/4]', className = '' }) {
  const { name = 'Collection', slug, image, count } = collection;
  const href = `/products?collection=${encodeURIComponent(slug || (name || '').trim())}`;

  return (
    <Link href={href} className={`group block ${className}`}>
      <div className={`media-zoom relative ${ratio} overflow-hidden border border-line bg-paper-warm`}>
        {image
          ? <img src={image} alt={name} loading="lazy"
                 className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]" />
          : <div className="absolute inset-0 bg-paper-deep" />}

        {/* Square index tab — legible on any image */}
        <span className="absolute top-0 left-0 z-10 bg-ink text-paper px-2.5 py-1 text-[10px] tracking-[0.2em] tabular-nums uppercase">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Caption below the frame */}
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="h-display text-ink leading-tight text-lg md:text-xl">{name}</h3>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.12em] uppercase text-ink-muted transition-colors group-hover:text-ink shrink-0">
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
