import Link from 'next/link';

/* 4-up category index — techwear datasheet. Prop-driven: pass `categories`
   from the API. category shape: { id, name, image }. Each tile is a framed,
   gently-radiused module with a mono index tag + corner tick. Skeleton
   while empty. */

export default function CategoryCards({ categories = [] }) {
  const skeleton = !categories.length;
  const list = skeleton ? Array.from({ length: 4 }) : categories.slice(0, 4);

  return (
    <section className="section-y">
      <div className="wrap">
        {/* datasheet header */}
        <div className="flex items-center justify-between border-t border-ink pt-3 mb-8">
          <span className="spec text-ink">INDEX — CATEGORIES</span>
          <span className="spec text-ink-muted hidden sm:inline">SELECT SYSTEM</span>
        </div>

        <div className="flex flex-col items-start gap-4 mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <p className="kicker mb-4">Shop by chapter</p>
            <h2 className="h-mark text-3xl sm:text-4xl md:text-5xl">Find your pair.</h2>
          </div>
          <Link href="/collections" className="btn-outline shrink-0">All collections</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {list.map((c, i) => (
            skeleton ? (
              <div key={i} className="aspect-[3/4] rounded-[16px] bg-paper-deep animate-pulse" />
            ) : (
              <Link
                key={c.id ?? i}
                href={`/products?collection=${encodeURIComponent(c.slug || (c.name || '').trim())}`}
                className="media-zoom ticked group relative aspect-[3/4] overflow-hidden rounded-[16px] bg-paper-warm border border-line shadow-soft transition-colors hover:border-accent"
              >
                {c.image
                  ? <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 bg-paper-deep" />}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-transparent group-hover:from-ink/80 transition-colors" />

                {/* mono index tag, top-left */}
                <span className="spec absolute top-3 left-3 text-paper/85 border border-paper/30 rounded px-1.5 py-0.5 z-10">
                  {String(i + 1).padStart(2, '0')}/
                </span>

                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-4 pb-5">
                  <span className="h-display text-paper text-xl md:text-2xl leading-tight">{c.name}</span>
                  <span className="spec inline-flex items-center gap-2 text-paper/70 group-hover:text-paper transition-colors">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    SHOP NOW
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
