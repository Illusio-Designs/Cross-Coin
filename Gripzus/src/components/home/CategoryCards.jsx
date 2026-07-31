import Link from 'next/link';

/* Category index — editorial gallery. Prop-driven: pass `categories` from
   the API. category shape: { id, name, image }. Big edge-forward images on
   white with a tiny caption below each — laid out asymmetrically, gallery
   style. Skeleton while empty. */

export default function CategoryCards({ categories = [] }) {
  const skeleton = !categories.length;
  const list = skeleton ? Array.from({ length: 4 }) : categories.slice(0, 4);

  // Asymmetric aspect ratios for a gallery-wall rhythm.
  const ratios = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-[4/5]', 'aspect-[3/4]'];

  return (
    <section className="section-y">
      <div className="wrap">
        {/* quiet header */}
        <div className="flex items-end justify-between mb-10 md:mb-14">
          <div>
            <p className="eyebrow text-ink-muted mb-3">Shop by chapter</p>
            <h2 className="h-display text-2xl md:text-3xl">Categories</h2>
          </div>
          <Link href="/collections" className="link-line">All collections</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 items-start">
          {list.map((c, i) => (
            skeleton ? (
              <div key={i}>
                <div className={`${ratios[i % ratios.length]} bg-paper-deep animate-pulse`} />
                <div className="mt-3 h-2.5 w-1/2 bg-paper-deep animate-pulse" />
              </div>
            ) : (
              <Link
                key={c.id ?? i}
                href={`/products?collection=${encodeURIComponent(c.slug || (c.name || '').trim())}`}
                className="group block md:[&:nth-child(even)]:mt-10"
              >
                <div className={`media-zoom relative ${ratios[i % ratios.length]} overflow-hidden bg-paper-warm`}>
                  {c.image
                    ? <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
                    : <div className="absolute inset-0 bg-paper-deep" />}
                </div>

                {/* tiny caption below the image */}
                <div className="mt-3.5 flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-ink">{c.name}</span>
                  <span className="eyebrow text-ink-muted transition-opacity opacity-60 group-hover:opacity-100">Shop</span>
                </div>
              </Link>
            )
          ))}
        </div>
      </div>
    </section>
  );
}
