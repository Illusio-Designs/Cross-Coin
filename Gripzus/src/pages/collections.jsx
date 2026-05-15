import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PageHero from '../components/common/PageHero';

const COLLECTIONS = [
  { slug: 'athletic',  label: 'Athletic',  count: 12, tagline: 'Cushion-zoned. Knit for grip and impact.',       image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1100&q=85&auto=format&fit=crop' },
  { slug: 'dress',     label: 'Dress',     count: 9,  tagline: 'Mercerised cotton, sharp ribbing, hidden seams.', image: 'https://images.unsplash.com/photo-1589810635657-232948472d98?w=1100&q=85&auto=format&fit=crop' },
  { slug: 'casual',    label: 'Casual',    count: 14, tagline: 'Wear-anywhere comfort, knit to last.',            image: 'https://images.unsplash.com/photo-1542219550-37153d387c27?w=1100&q=85&auto=format&fit=crop' },
  { slug: 'wool',      label: 'Wool',      count: 6,  tagline: 'Merino warmth, naturally breathable.',            image: 'https://images.unsplash.com/photo-1577538928305-3807c3993047?w=1100&q=85&auto=format&fit=crop' },
  { slug: 'gift-sets', label: 'Gift Sets', count: 4,  tagline: 'Curated three-packs in the Gripzus box.',         image: 'https://images.unsplash.com/photo-1607793483011-d10bb1d8be0c?w=1100&q=85&auto=format&fit=crop' },
];

export default function CollectionsPage() {
  const [active, setActive] = useState(0);

  return (
    <>
      <Head><title>Collections — Gripzus</title></Head>

      <PageHero
        eyebrow="Curated worlds"
        title="The"
        accent="collections."
        intro="Five ways to wear a Gripzus pair. Hover an index entry to preview — pick one to enter."
      />

      <section className="section-y">
        <div className="wrap">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 items-start">

            {/* Index list */}
            <ol className="border-t border-line">
              {COLLECTIONS.map((c, i) => (
                <li key={c.slug}>
                  <Link
                    href={`/products?category=${c.slug}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className={`group flex items-center gap-5 md:gap-8 py-6 md:py-8 border-b border-line transition-colors ${
                      active === i ? 'opacity-100' : 'lg:opacity-45 hover:opacity-100'
                    }`}
                  >
                    <span className="font-display text-ink-muted text-sm w-8 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    <div className="flex-1 min-w-0">
                      <h2 className="h-display text-ink leading-none" style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)' }}>
                        {c.label}
                      </h2>
                      <p className="prose-body text-sm mt-2 hidden sm:block">{c.tagline}</p>
                    </div>

                    {/* Mobile thumb */}
                    <div className="lg:hidden w-20 h-24 shrink-0 overflow-hidden rounded bg-paper-warm">
                      <img src={c.image} alt={c.label} className="w-full h-full object-cover" />
                    </div>

                    <span className="shrink-0 text-ink transition-transform group-hover:translate-x-1">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 17L17 7M10 7h7v7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>

            {/* Preview pane — sticky, screen-height, follows the hovered entry */}
            <div className="hidden lg:block sticky top-[88px]">
              <div className="relative h-[calc(100vh-120px)] overflow-hidden rounded-xl bg-gray-200">
                {COLLECTIONS.map((c, i) => (
                  <img
                    key={c.slug}
                    src={c.image}
                    alt={c.label}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                      active === i ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <p className="eyebrow text-paper/75 mb-1.5">Collection</p>
                  <p className="h-display text-paper text-3xl">{COLLECTIONS[active].label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
