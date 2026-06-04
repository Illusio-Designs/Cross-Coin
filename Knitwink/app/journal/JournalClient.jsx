'use client'

import { useEffect, useState } from 'react'
import { getPosts } from '@/lib/api/blog'
import { BlogCard } from '@/components/home/BlogCard'
import SeoWrapper from '@/components/SeoWrapper'

// Client subtree for /journal — see app/journal/page.jsx for the server shell.
export default function JournalClient() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPosts().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false))
  }, [])

  return (
    <SeoWrapper pageName="blog">
      {/* Header */}
      <section className="relative overflow-hidden bg-brand-black px-4 pt-32 pb-16 text-center sm:px-6 sm:pt-36 sm:pb-20 md:px-10 md:pt-40 md:pb-28">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />
        <div className="relative">
          <h1 className="mt-3 font-display text-3xl font-normal text-white sm:text-4xl lg:text-5xl">The Journal</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/45">
            Stories, ideas and updates from the world of knitwear.
          </p>
        </div>
      </section>

      {/* Grid — 4 columns */}
      <section className="bg-off-white px-4 py-10 sm:px-6 md:py-12">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="aspect-[3/4] animate-pulse bg-gray-100" />
                <div className="flex flex-col gap-2 p-4">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="py-20 text-center text-sm text-gray-400">No posts yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {posts.map((post) => <BlogCard key={post.id} post={post} />)}
          </div>
        )}
      </section>
    </SeoWrapper>
  )
}
