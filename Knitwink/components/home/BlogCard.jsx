'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * BlogCard — shared between BlogStrip (compact) and Journal listing (full)
 * size="compact" → h-40 image, smaller text (default for strip)
 * size="full"    → h-52 image, normal text (for journal listing page)
 */
export function BlogCard({ post, size = 'compact' }) {
  const imgH = size === 'full' ? 'h-56' : 'h-48'
  const titleCls = size === 'full' ? 'text-sm font-bold' : 'text-xs font-bold'
  const excerptCls = size === 'full' ? 'text-xs' : 'text-[11px]'

  return (
    <Link
      href={`/journal/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        {post.coverImage
          ? <img src={post.coverImage} alt={post.title} className={`${imgH} w-full object-cover transition-transform duration-500 group-hover:scale-105`} />
          : <div className={`${imgH} w-full bg-gray-100`} />
        }
        {post.category && (
          <span className="absolute left-3 top-3 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-brand-black backdrop-blur-sm">
            {post.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className={`${titleCls} leading-snug text-brand-black line-clamp-2`}>{post.title}</h3>
        <p className={`${excerptCls} leading-relaxed text-gray-400 line-clamp-2 flex-1`}>{post.excerpt}</p>
        <div className="flex items-center justify-between pt-1">
          {post.author?.name && (
            <span className="text-[10px] text-gray-400">{post.author.name}</span>
          )}
          <ArrowRight size={13} className="ml-auto text-gray-300 transition-colors group-hover:text-brand-black" />
        </div>
      </div>
    </Link>
  )
}
