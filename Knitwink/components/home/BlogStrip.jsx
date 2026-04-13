'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPosts } from '@/lib/api/blog'
import { BlogCard } from './BlogCard'

export function BlogStrip() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    getPosts().then((all) => setPosts(all.slice(0, 4))).catch(() => {})
  }, [])

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {posts.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="h-40 animate-pulse bg-gray-100" />
                <div className="flex flex-col gap-2 p-3">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))
          : posts.map((post) => <BlogCard key={post.slug} post={post} />)
        }
      </div>

      <div className="mt-4 text-center sm:hidden">
        <Link href="/journal" className="inline-flex items-center gap-1 text-xs font-medium text-brand-black">
          View all <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
