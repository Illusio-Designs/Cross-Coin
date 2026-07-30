import Link from 'next/link';

/* 4-up category grid. Prop-driven: pass `categories` from the API.
   category shape: { id, name, image }. Skeleton while empty. */

export default function CategoryCards({ categories = [] }) {
  const skeleton = !categories.length;
  const list = skeleton ? Array.from({ length: 4 }) : categories.slice(0, 4);

  return (
    <section className="section-y">
      <div className="wrap">
        <div className="flex flex-col items-start gap-5 mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <span className="kicker mb-4">Shop By Chapter</span>
            <h2 className="h-mark text-ink text-4xl sm:text-5xl md:text-7xl">Find Your Pair.</h2>
          </div>
          <Link href="/collections" className="btn-outline shrink-0">All collections</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line">
          {list.map((c, i) => (
            skeleton ? (
              <div key={i} className="aspect-[3/4] bg-paper-deep animate-pulse" />
            ) : (
              <Link
                key={c.id ?? i}
                href={`/products?collection=${encodeURIComponent(c.slug || (c.name || '').trim())}`}
                className="group relative aspect-[3/4] overflow-hidden bg-paper-warm media-zoom"
              >
                {c.image
                  ? <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 bg-paper-deep" />}
                <div className="absolute inset-0 bg-ink/25 group-hover:bg-ink/50 transition-colors" />

                {/* Big outlined index, top-left */}
                <span className="absolute top-3 left-3 num-index text-3xl md:text-4xl" style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.7)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                  <span className="block font-display text-paper text-xl md:text-2xl uppercase leading-none tracking-tight" style={{ fontWeight: 900 }}>
                    {c.name}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-2 text-paper/0 group-hover:text-paper text-[11px] font-bold tracking-[0.2em] uppercase transition-colors">
                    Shop Now
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            )
          ))}
        </div>
      </div>
    </section>
  );
}
