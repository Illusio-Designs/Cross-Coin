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
 * BlogCard — borderless editorial entry.
 * Just a rounded image, then the caption beneath it on the page background.
 * No card box, no border, no padding frame.
 */
export function BlogCard({ post }) {
  if (!post) return null

  const date = formatDate(post.publishedAt || post.createdAt)

  return (
    <Link
      href={`/journal/${post.slug}`}
      className="group flex flex-col focus-visible:outline-none"
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-paper">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="h-full w-full bg-paper" />
        )}
      </div>

      {/* Caption — sits directly on the page background */}
      <div className="pt-5">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">
          {post.category && <span>{post.category}</span>}
          {post.category && date && (
            <span className="h-px w-4 bg-gold/40" aria-hidden />
          )}
          {date && <span>{date}</span>}
        </div>

        <h3 className="vq-display mt-3 line-clamp-2 text-[1.35rem] leading-[1.2] tracking-[-0.01em] text-ink transition-colors duration-300 group-hover:text-gold-deep">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-text-muted">
            {post.excerpt}
          </p>
        )}

        <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-ink">
          Read Story
          <ArrowRight
            size={12}
            strokeWidth={1.8}
            className="text-gold transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  )
}
