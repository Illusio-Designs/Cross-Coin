import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { getPosts } from '@/lib/api/blog'
import { SITE_NAME } from '@/lib/constants'
import type { BlogPost } from '@/types'

export const metadata: Metadata = {
  title: 'The Journal',
  description: `Stories, ideas, and updates from ${SITE_NAME}.`,
}

const FALLBACK_POSTS: BlogPost[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  slug: `post-${i + 1}`,
  title: ['Why Natural Materials Matter', 'The Science of SweetFoam®', 'Our Carbon Journey', 'Meet the Merino Farmers', 'Designing for Comfort', 'The Future of Sustainable Fashion'][i],
  excerpt: 'A closer look at how we think about materials, sustainability, and the future of footwear.',
  body: '',
  category: ['Materials', 'Innovation', 'Sustainability', 'People', 'Design', 'Industry'][i],
  coverImage: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=900&q=80',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=900&q=80',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=900&q=80',
  ][i],
  author: { name: 'Allbirds Team', avatar: '' },
  publishedAt: new Date(2026, 2 - i, 10).toISOString(),
  readTime: 4 + i,
}))

export default async function JournalPage() {
  const posts = await getPosts().catch(() => FALLBACK_POSTS)
  const [featured, ...rest] = posts

  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-6 py-16 md:px-10 lg:px-16">
      <div className="mx-auto max-w-site">
        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="font-display text-5xl font-normal text-brand-black lg:text-6xl">The Journal</h1>
          <p className="mx-auto mt-4 max-w-md text-base text-gray-600">
            Stories, ideas, and updates from the world of natural footwear.
          </p>
        </div>

        {/* Featured post */}
        {featured && (
          <Link
            href={`/journal/${featured.slug}`}
            className="group mb-16 block overflow-hidden rounded-2xl bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative aspect-video lg:aspect-auto lg:min-h-[400px]">
                <Image
                  src={featured.coverImage}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-150 group-hover:scale-[1.01]"
                  priority
                />
              </div>
              <div className="flex flex-col justify-center gap-4 p-8 lg:p-12">
                <span className="text-xs font-medium uppercase tracking-widest text-sage">
                  {featured.category}
                </span>
                <h2 className="font-display text-3xl font-normal text-brand-black lg:text-4xl">
                  {featured.title}
                </h2>
                <p className="text-base leading-relaxed text-gray-600">{featured.excerpt}</p>
                <p className="text-xs text-gray-400">
                  {format(new Date(featured.publishedAt), 'd MMM yyyy')} · {featured.readTime} min read
                </p>
                <span className="text-sm text-brand-black underline underline-offset-4 transition-colors duration-150 group-hover:text-sage">
                  Read More
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Post grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/journal/${post.slug}`}
      className="group flex flex-col gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-150 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-sage">
          {post.category}
        </span>
        <h3 className="text-sm font-medium text-brand-black transition-colors duration-150 group-hover:text-sage">
          {post.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">{post.excerpt}</p>
        <p className="text-xs text-gray-400">
          {format(new Date(post.publishedAt), 'd MMM yyyy')} · {post.readTime} min read
        </p>
      </div>
    </Link>
  )
}
