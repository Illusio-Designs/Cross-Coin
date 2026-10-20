'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPosts } from '@/lib/api/blog'
import { BlogCard } from './BlogCard'
import { BlogCardSkeleton, SkeletonRegion } from '@/components/ui/Skeleton'

export function BlogStrip({ posts: postsProp = null }) {
  // Server-provided posts are used directly; the client fetch runs only as a
  // fallback when the server didn't supply any.
  const [posts, setPosts] = useState(postsProp?.length ? postsProp.slice(0, 4) : [])
  const [done, setDone] = useState(!!postsProp?.length)

  useEffect(() => {
    if (postsProp?.length) return // server supplied posts — don't refetch
    getPosts().then((all) => setPosts(all.slice(0, 4))).catch(() => {}).finally(() => setDone(true))
  }, [postsProp])

  // Nothing to show once the fallback fetch has finished empty.
  if (done && posts.length === 0) return null

  return (
    <div className="px-3 py-6">
      {/* Title row — centered label + right-aligned view all */}
      <div className="relative mb-5 flex items-center justify-center">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-black">The Journal</p>
        <Link href="/journal" className="absolute right-0 hidden items-center gap-1 text-xs text-gray-400 hover:text-brand-black sm:flex">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {/* 4 cards — 2 cols mobile, 4 cols desktop */}
      {posts.length === 0 ? (
        <SkeletonRegion label="Loading journal posts…" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <BlogCardSkeleton key={i} />)}
        </SkeletonRegion>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {posts.map((post) => <BlogCard key={post.slug} post={post} />)}
        </div>
      )}

      <div className="mt-4 text-center sm:hidden">
        <Link href="/journal" className="inline-flex items-center gap-1 text-xs font-medium text-brand-black">
          View all <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
