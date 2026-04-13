'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPosts } from '@/lib/api/blog'
import { BlogCard } from './BlogCard'
import { SectionHeader } from '@/components/ui/SectionHeader'

export function BlogStrip() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    getPosts().then((all) => setPosts(all.slice(0, 3))).catch(() => {})
  }, [])

  return (
    <section className="bg-gray-50 px-4 py-12 md:px-8 lg:px-16">
      <div className="mb-8 flex items-end justify-between">
        <SectionHeader eyebrow="Knitwink Journal" title="Tips, Trends &amp; <strong>Knitwear Tales</strong>" />
        <Link href="/journal" className="hidden items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-black sm:flex">
          View all <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="h-52 animate-pulse bg-gray-100" />
                <div className="flex flex-col gap-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-9 w-full animate-pulse rounded-xl bg-gray-100" />
                </div>
              </div>
            ))
          : posts.map((post) => <BlogCard key={post.slug} post={post} />)
        }
      </div>

      <div className="mt-6 text-center sm:hidden">
        <Link href="/journal" className="inline-flex items-center gap-1 text-xs font-medium text-brand-black">
          View all <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  )
}
