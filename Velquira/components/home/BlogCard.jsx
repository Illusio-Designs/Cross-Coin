'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

function formatDate(str) {
  try {
    return new Date(str)
      .toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .toUpperCase()
  } catch {
    return ''
  }
}

/**
 * BlogCard — premium editorial card.
 * Mirrors the proven Knitwink card structure (rounded bordered card,
 * image + caption below, refined hover) dressed for the jewellery house:
 * gold hairline border, warm-cream image bed, serif title, gold
 * uppercase date eyebrow, soft amber-tinted hover shadow.
 */
export function BlogCard({ post }) {
  if (!post) return null

  return (
    <Link
      href={`/journal/${post.slug}`}
      className="group flex flex-col rounded-2xl border border-gold/20 bg-white p-3 transition-[border-color,box-shadow] duration-300 hover:border-gold/55 hover:shadow-[0_22px_45px_-26px_rgba(143,102,32,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-cream">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-cream" />
        )}

        {post.category && (
          <div className="absolute left-2.5 top-2.5">
            <span className="block rounded-full border border-gold/45 bg-white/95 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.22em] text-gold">
              {post.category}
            </span>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="mt-3.5 px-1 pb-1">
        {post.publishedAt && (
          <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-gold">
            {formatDate(post.publishedAt)}
          </p>
        )}

        <h3 className="mt-1.5 line-clamp-2 font-display text-[18px] leading-snug text-brand-black">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-brand-black/60">
            {post.excerpt}
          </p>
        )}

        <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-gold transition-colors duration-200 group-hover:text-gold-deep">
          Read the entry
          <ArrowRight
            size={11}
            strokeWidth={1.7}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </p>
      </div>
    </Link>
  )
}