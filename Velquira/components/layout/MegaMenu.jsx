'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { JEWELLERY_CATEGORIES } from '@/lib/constants'

const CATEGORY_NOTES = {
  Rings: 'Solitaires, bands & statement pieces',
  Necklaces: 'Pendants, chains & layering styles',
  Earrings: 'Studs, hoops & drop silhouettes',
  Bracelets: 'Tennis, bangles & cuffs',
  Bridal: 'Engagement & wedding heirlooms',
}

const FEATURED = [
  {
    href: '/products?category=Bridal',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900',
    eyebrow: 'Featured',
    title: 'Bridal Collection',
    caption: 'Heirloom diamonds, made to last generations.',
  },
  {
    href: '/collections',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=900',
    eyebrow: 'New In',
    title: '18k Gold Studio',
    caption: 'Hand-finished products from our studio.',
  },
]

export function MegaMenu({ activeMenu, categories = JEWELLERY_CATEGORIES }) {
  return (
    <AnimatePresence>
      {activeMenu === 'products' && (
        <motion.div
          key="mega"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.28, ease: [0.22, 0.65, 0.3, 1] }}
          className="absolute left-0 right-0 top-full z-40 border-t border-line bg-cream shadow-[0_24px_64px_rgba(20,20,20,0.10)]"
        >
          <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-0 px-6 py-10 md:grid-cols-[1.1fr_auto_1.3fr] md:px-12 md:py-12">
            <div className="md:pr-10">
              <p className="text-[9px] font-medium uppercase tracking-[0.4em] text-gold">The Collection</p>
              <ul className="mt-6 flex flex-col gap-3">
                {categories.map((cat, i) => (
                  <li key={cat.href}>
                    <Link href={cat.href} className="group flex items-baseline gap-4 py-1">
                      <span className="font-sans text-[10px] tabular-nums tracking-[0.2em] text-gold/60">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="flex flex-col">
                        <span className="font-display text-[26px] font-semibold tracking-[-0.02em] leading-tight text-brand-black transition-colors duration-300 group-hover:text-gold-deep md:text-[28px]">
                          {cat.label}
                        </span>
                        {CATEGORY_NOTES[cat.label] && (
                          <span className="mt-0.5 font-sans text-[11px] text-brand-black/50">
                            {CATEGORY_NOTES[cat.label]}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden self-stretch w-px bg-gradient-to-b from-transparent via-gold/45 to-transparent md:block" aria-hidden />

            <div className="mt-8 grid grid-cols-2 gap-4 md:mt-0 md:pl-10">
              {FEATURED.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="group relative aspect-[3/4] overflow-hidden bg-brand-black/5"
                >
                  <img
                    src={f.image}
                    alt={f.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 via-brand-black/15 to-transparent" />
                  <div className="absolute inset-2 border border-gold/0 transition-colors duration-500 group-hover:border-gold/40" aria-hidden />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[9px] uppercase tracking-[0.34em] text-gold-light">{f.eyebrow}</p>
                    <p className="mt-1 font-display text-lg text-white">{f.title}</p>
                    <p className="mt-1 text-[11px] leading-snug text-white/70">{f.caption}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
