'use client'

import { useEffect, useState } from 'react'
import { getPosts } from '@/lib/api/blog'
import { BlogCard } from '@/components/home/BlogCard'

export default function JournalPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPosts().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false))
  }, [])

  return (
    <>
      {/* Header */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-brand-black px-6 py-14 md:px-10 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">Knitwink</p>
        <h1 className="mt-2 font-display text-4xl font-normal text-white lg:text-5xl">The Journal</h1>
        <p className="mt-3 text-sm text-white/50">Stories, ideas and updates from the world of knitwear.</p>
      </section>

      {/* Grid */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-off-white px-4 py-10 md:px-6 md:py-12">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="h-52 animate-pulse bg-gray-100" />
                <div className="flex flex-col gap-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                  <div className="h-9 w-full animate-pulse rounded-xl bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="py-20 text-center text-sm text-gray-400">No posts yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => <BlogCard key={post.id} post={post} />)}
          </div>
        )}
      </section>
    </>
  )
}
