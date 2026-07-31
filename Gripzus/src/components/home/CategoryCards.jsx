import Link from 'next/link';

/* 4-up category grid. Prop-driven: pass `categories` from the API.
   category shape: { id, name, image }. Skeleton while empty. */

export default function CategoryCards({ categories = [] }) {
  const skeleton = !categories.length;
  const list = skeleton ? Array.from({ length: 4 }) : categories.slice(0, 4);

  return (
    <section className="section-y">
      <div className="wrap">
        <div className="flex flex-col items-start gap-4 mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <p className="eyebrow mb-3">Shop by chapter</p>
            <h2 className="h-display text-2xl sm:text-3xl md:text-5xl">Find <span className="h-italic">your pair.</span></h2>
          </div>
          <Link href="/collections" className="btn-outline shrink-0">All collections</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {list.map((c, i) => (
            skeleton ? (
              <div key={i} className="aspect-[3/4] rounded-[24px] bg-paper-deep animate-pulse" />
            ) : (
              <Link
                key={c.id ?? i}
                href={`/products?collection=${encodeURIComponent(c.slug || (c.name || '').trim())}`}
                className="media-zoom group relative aspect-[3/4] overflow-hidden rounded-[24px] bg-paper-warm border border-line shadow-soft"
              >
                {c.image
                  ? <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 bg-paper-deep" />}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent group-hover:from-ink/65 transition-colors" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 px-4 pb-6 text-center">
                  <span className="h-display text-paper text-2xl md:text-3xl">{c.name}</span>
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-paper/70 group-hover:text-paper transition-colors">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    Shop now
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
