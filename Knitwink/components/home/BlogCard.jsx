'use client'

import Link from 'next/link'
import { Clock, User, Play } from 'lucide-react'

function formatDate(str) {
  try { return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '' }
}

export function BlogCard({ post }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Image */}
      <div className="relative overflow-hidden rounded-t-2xl">
        {post.coverImage
          ? <img src={post.coverImage} alt={post.title} className="h-52 w-full object-cover" />
          : <div className="h-52 w-full bg-gray-100" />
        }
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-brand-black backdrop-blur-sm shadow-sm">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Blog
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-sm font-bold leading-snug text-brand-black line-clamp-2">{post.title}</h3>
        <p className="text-xs leading-relaxed text-gray-500 line-clamp-2">{post.excerpt}</p>

        {/* Category + Author */}
        <div className="flex flex-wrap gap-2">
          {post.category && (
            <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600">
              <Clock size={11} className="text-gray-400" />
              {post.category}
            </span>
          )}
          {post.author?.name && (
            <span className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500">
              <User size={11} />
              {post.author.name}
            </span>
          )}
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/journal/${post.slug}`}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-black py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
        >
          <Play size={13} className="fill-white" />
          Read Article
        </Link>
      </div>
    </div>
  )
}
