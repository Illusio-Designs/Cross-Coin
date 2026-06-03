'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { JEWELLERY_CATEGORIES } from '@/lib/constants';

// Short editorial descriptors for each jewellery category.
const CATEGORY_NOTES = {
  Rings: 'Solitaires, bands & statement pieces',
  Necklaces: 'Pendants, chains & layering edits',
  Earrings: 'Studs, hoops & drop silhouettes',
  Bracelets: 'Tennis, bangles & cuffs',
  Bridal: 'Engagement & wedding heirlooms',
};

// Two-up featured image strip (Unsplash IDs preserved from previous component).
const FEATURED = [
  {
    href: '/products?category=Bridal',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900',
    eyebrow: 'Featured',
    title: 'The Bridal Edit',
    caption: 'Heirloom diamonds, made to last generations.',
  },
  {
    href: '/collections',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=900',
    eyebrow: 'New In',
    title: '18k Gold Atelier',
    caption: 'Hand-finished pieces from the workshop.',
  },
];

export function MegaMenu({ activeMenu, categories = JEWELLERY_CATEGORIES }) {
  return (
    <AnimatePresence>
      {activeMenu === 'products' && (
        <motion.div
          key="mega"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.22, 0.65, 0.3, 1] }}
          className="absolute left-0 right-0 top-full z-40 overflow-hidden border-b border-gold/25 bg-cream shadow-[0_22px_60px_rgba(58,46,26,0.14)]"
        >
          {/* very subtle gold sweep overlay */}
          <span className="vq-shine" aria-hidden />

          <div className="relative mx-auto grid max-w-[1480px] grid-cols-[1.05fr_auto_1.35fr] gap-0 px-6 py-12 md:px-10">

            {/* LEFT — editorial category column */}
            <div className="pr-10">
              <p className="mb-7 text-[10px] font-medium uppercase tracking-[0.32em] text-gold">
                The Collection
              </p>
              <ul className="vq-stagger flex flex-col gap-4">
                {categories.map((cat, i) => (
                  <li key={cat.href} className="vq-fade-up">
                    <Link href={cat.href} className="group flex items-baseline gap-4">
                      <span className="font-display text-[11px] uppercase tracking-[0.3em] text-gold/70 transition-colors group-hover:text-gold-deep">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="flex flex-col">
                        <span className="font-display text-[30px] leading-[1.1] text-brand-black transition-colors duration-300 group-hover:text-gold-deep">
                          {cat.label}
                        </span>
                        {CATEGORY_NOTES[cat.label] && (
                          <span className="mt-0.5 text-[11px] tracking-wide text-brand-black/55">
                            {CATEGORY_NOTES[cat.label]}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* CENTER — thin gold vertical rule */}
            <div
              className="self-stretch w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent"
              aria-hidden
            />

            {/* RIGHT — 2-up featured image strip */}
            <div className="grid grid-cols-2 gap-5 pl-10">
              {FEATURED.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="vq-lift group relative block aspect-[3/4] overflow-hidden rounded-sm bg-brand-black/5"
                >
                  <img
                    src={f.image}
                    alt={f.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-black/75 via-brand-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[9.5px] font-medium uppercase tracking-[0.32em] text-gold-light">
                      {f.eyebrow}
                    </p>
                    <p className="mt-1 font-display text-[20px] leading-tight text-white">
                      {f.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-white/75">
                      {f.caption}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}