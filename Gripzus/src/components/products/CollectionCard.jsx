import Link from 'next/link';

/* Gripzus CollectionCard — editorial gallery.
   A full-bleed collection image with an index number top-left, the name set
   over a bottom scrim, and a "Shop" arrow that slides on hover. Shared
   component so collections look identical on the home grid, the collections
   index and anywhere else. Props:
     collection : { id, name, slug, image, count? }
     index      : 0-based position (rendered as 01, 02, …)
     ratio      : tailwind aspect class (default aspect-[3/4]) */

export default function CollectionCard({ collection = {}, index = 0, ratio = 'aspect-[3/4]', className = '' }) {
  const { name = 'Collection', slug, image, count } = collection;
  const href = `/products?collection=${encodeURIComponent(slug || (name || '').trim())}`;

  return (
    <Link href={href} className={`group block lift ${className}`}>
      <div className={`media-zoom relative ${ratio} overflow-hidden rounded-2xl border border-line bg-paper-warm shadow-sm group-hover:shadow-card transition-shadow duration-500`}>
        {image
          ? <img src={image} alt={name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-paper-deep" />}

        {/* Scrim for legible white type */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Index number */}
        <span className="absolute top-3.5 left-4 text-paper/70 text-[11px] tracking-[0.16em] tabular-nums z-10">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Title + shop */}
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 z-10">
          <h3 className="h-display text-paper leading-[1.05] text-lg md:text-xl lg:text-2xl">{name}</h3>
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-paper text-[11px] font-medium tracking-[0.12em] uppercase">
              Shop
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </span>
            {typeof count === 'number' && count > 0 && (
              <span className="text-paper/60 text-[11px] tabular-nums">{count} pairs</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
