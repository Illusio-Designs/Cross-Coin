import Link from 'next/link';

/* 4-up category grid. Prop-driven: pass `categories` from the API.
   category shape: { id, name, image }. Skeleton while empty. */

export default function CategoryCards({ categories = [] }) {
  const skeleton = !categories.length;
  const list = skeleton ? Array.from({ length: 4 }) : categories.slice(0, 4);

  return (
    <section className="section-y">
      <div className="wrap">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="eyebrow mb-3">Shop by chapter</p>
            <h2 className="h-display text-3xl md:text-5xl">Find <span className="h-italic">your pair.</span></h2>
          </div>
          <Link href="/collections" className="hidden sm:inline-flex btn-outline">All collections</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {list.map((c, i) => (
            skeleton ? (
              <div key={i} className="aspect-[3/4] rounded-xl bg-gray-200 animate-pulse" />
            ) : (
              <Link
                key={c.id ?? i}
                href={`/products?collection=${encodeURIComponent(c.slug || (c.name || '').trim())}`}
                className="group relative overflow-hidden rounded-xl bg-paper-warm min-h-[260px] flex"
              >
                {c.image
                  ? <img src={c.image} alt={c.name} className="block w-full h-auto" />
                  : <div className="w-full min-h-[260px] bg-paper-deep" />}
                <div className="absolute inset-0 bg-ink/15 group-hover:bg-ink/40 transition-colors" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
                  <span className="font-display text-paper text-2xl md:text-3xl">{c.name}</span>
                  <span className="eyebrow text-paper/0 group-hover:text-paper/90 transition-colors">Shop now →</span>
                </div>
              </Link>
            )
          ))}
        </div>
      </div>
    </section>
  );
}
