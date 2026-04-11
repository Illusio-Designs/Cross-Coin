'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPosts } from '@/lib/api/blog'
import { BlogCard } from './BlogCard'

export function BlogStrip() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    getPosts().then((all) => setPosts(all.slice(0, 3))).catch(() => {})
  }, [])

  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-4 py-10 md:px-6 md:py-12">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">The Journal</p>
          <h2 className="mt-1 font-display text-2xl font-normal text-brand-black lg:text-3xl">Stories worth reading</h2>
        </div>
        <Link href="/journal" className="hidden text-xs font-medium text-gray-500 underline underline-offset-4 hover:text-brand-black sm:block">
          View all
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="h-52 animate-pulse bg-gray-100" />
                <div className="flex flex-col gap-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                  <div className="h-9 w-full animate-pulse rounded-xl bg-gray-100" />
                </div>
              </div>
            ))
          : posts.map((post) => <BlogCard key={post.slug} post={post} />)
        }
      </div>

      <div className="mt-6 text-center sm:hidden">
        <Link href="/journal" className="text-xs font-medium text-brand-black underline underline-offset-4">
          View all articles
        </Link>
      </div>
    </section>
  )
}
