'use client'

import Link from 'next/link'

function formatDate(str) {
  try { return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return '' }
}

// Match the CrossCoin blog card: ask ImageKit for an exact 800x450 (16:9)
// WebP/AVIF so every card image is pre-cropped to the same size server-side,
// sharp and light. Non-ImageKit URLs pass through unchanged.
function blogImg(src) {
  if (!src || typeof src !== 'string' || !src.includes('ik.imagekit.io')) return src
  return `${src.split('?')[0]}?tr=w-800,h-450,q-70,f-auto`
}

export function BlogCard({ post }) {
  return (
    <Link
      href={`/journal/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image — fixed aspect so every card in the grid lines up. object-cover
          fills the frame uniformly (a contained + blurred-fill treatment left
          non-16:11 images letterboxed with a messy blurred text bleed). */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
        {post.coverImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={blogImg(post.coverImage)} alt={post.title} className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105" />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Date */}
        <p className="text-xs text-gray-400">
          {formatDate(post.publishedAt || post.createdAt)}
        </p>

        {/* Title — bold, larger */}
        <h3 className="text-base font-bold leading-snug text-brand-black line-clamp-2">{post.title}</h3>

        {/* Excerpt */}
        <p className="text-sm leading-relaxed text-gray-500 line-clamp-3 flex-1">{post.excerpt}</p>
      </div>
    </Link>
  )
}
